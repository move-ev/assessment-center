import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/server/db";

type AssignmentRecord = {
	taskId: string;
	quantitativeRatings: Array<{ criteriaId: string }>;
	qualitativeRatings: Array<{ criteriaId: string }>;
};

type GroupTaskOverview = {
	id: string;
	name: string;
	isTeamTask: boolean;
	criteriaCount: number;
	scheduledDates: Date[];
};

type ParticipantTaskOverview = {
	taskId: string;
	totalAssignments: number;
	completedAssignments: number;
};

type GroupOverview = {
	id: string;
	name: string;
	participants: Array<{
		id: string;
		name: string;
		tasks: ParticipantTaskOverview[];
	}>;
	tasks: GroupTaskOverview[];
	completionPercent: number;
};

export type EvaluationOverviewData = {
	summary: {
		participantCount: number;
		groupCount: number;
		taskCount: number;
		dayCount: number;
		reviewerCount: number;
		totalAssignments: number;
		reviewableAssignments: number;
		completedAssignments: number;
		unratedAssignments: number;
		assignmentsWithoutCriteria: number;
		completionPercent: number;
	};
	groups: GroupOverview[];
};

type QueryResult = NonNullable<
	Awaited<ReturnType<typeof fetchOverviewSourceData>>
>;

async function fetchOverviewSourceData(acId: string) {
	return db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: {
			id: true,
			days: {
				select: { id: true, date: true },
				orderBy: { date: "asc" },
			},
			reviewers: {
				select: { id: true },
			},
			tasks: {
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					isTeamTask: true,
					criteria: {
						where: { deletedAt: null },
						select: { id: true },
					},
				},
				orderBy: { createdAt: "asc" },
			},
			groups: {
				select: {
					id: true,
					name: true,
					scheduleEntries: {
						select: {
							id: true,
							orderIndex: true,
							day: {
								select: { date: true },
							},
							task: {
								select: { id: true },
							},
						},
						orderBy: [{ day: { date: "asc" } }, { orderIndex: "asc" }],
					},
				},
				orderBy: { createdAt: "asc" },
			},
			participants: {
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					groupMemberships: {
						select: { groupId: true },
					},
					reviewerAssignments: {
						where: { reviewer: { assessmentCenterId: acId } },
						select: {
							id: true,
							taskId: true,
							quantitativeRatings: {
								where: { deletedAt: null },
								select: { criteriaId: true },
							},
							qualitativeRatings: {
								where: { deletedAt: null },
								select: { criteriaId: true },
							},
						},
						orderBy: { createdAt: "asc" },
					},
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});
}

function getCompletedCriteriaCount(assignment: AssignmentRecord) {
	const completedCriteriaIds = new Set<string>();

	for (const rating of assignment.quantitativeRatings) {
		completedCriteriaIds.add(rating.criteriaId);
	}

	for (const rating of assignment.qualitativeRatings) {
		completedCriteriaIds.add(rating.criteriaId);
	}

	return completedCriteriaIds.size;
}

function buildTaskLookup(data: QueryResult) {
	return new Map(
		data.tasks.map((task) => [
			task.id,
			{
				id: task.id,
				name: task.name,
				isTeamTask: task.isTeamTask,
				criteriaCount: task.criteria.length,
			},
		]),
	);
}

function buildGroupTaskMap(
	data: QueryResult,
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	const taskMapByGroup = new Map<string, Map<string, GroupTaskOverview>>();

	for (const group of data.groups) {
		const taskMap = new Map<string, GroupTaskOverview>();

		for (const entry of group.scheduleEntries) {
			const task = taskLookup.get(entry.task.id);
			if (!task) {
				continue;
			}

			const existing = taskMap.get(task.id);
			if (existing) {
				existing.scheduledDates.push(entry.day.date);
				continue;
			}

			taskMap.set(task.id, {
				...task,
				scheduledDates: [entry.day.date],
			});
		}

		taskMapByGroup.set(group.id, taskMap);
	}

	return taskMapByGroup;
}

function getParticipantTaskSummaries(
	assignments: AssignmentRecord[],
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	const taskSummaries = new Map<string, ParticipantTaskOverview>();

	for (const assignment of assignments) {
		const task = taskLookup.get(assignment.taskId);
		if (!task) {
			continue;
		}

		const currentSummary = taskSummaries.get(assignment.taskId) ?? {
			taskId: assignment.taskId,
			totalAssignments: 0,
			completedAssignments: 0,
		};

		currentSummary.totalAssignments += 1;

		if (
			task.criteriaCount > 0 &&
			getCompletedCriteriaCount(assignment) >= task.criteriaCount
		) {
			currentSummary.completedAssignments += 1;
		}

		taskSummaries.set(assignment.taskId, currentSummary);
	}

	return taskSummaries;
}

function buildUnassignedGroup() {
	return {
		id: "unassigned",
		name: "Ohne Gruppe",
		tasks: new Map<string, GroupTaskOverview>(),
		participants: [] as GroupOverview["participants"][number][],
		taskCompletion: { total: 0, completed: 0 },
	};
}

function sortGroupTasks(tasks: GroupTaskOverview[]) {
	return tasks.sort((left, right) => {
		const leftDate =
			left.scheduledDates[0]?.getTime() ?? Number.MAX_SAFE_INTEGER;
		const rightDate =
			right.scheduledDates[0]?.getTime() ?? Number.MAX_SAFE_INTEGER;

		if (leftDate !== rightDate) {
			return leftDate - rightDate;
		}

		return left.name.localeCompare(right.name, "de-DE");
	});
}

function buildGroups(
	data: QueryResult,
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	const taskMapByGroup = buildGroupTaskMap(data, taskLookup);
	const groups = data.groups.map((group) => ({
		id: group.id,
		name: group.name,
		tasks: taskMapByGroup.get(group.id) ?? new Map<string, GroupTaskOverview>(),
		participants: [] as GroupOverview["participants"][number][],
		taskCompletion: { total: 0, completed: 0 },
	}));

	const groupById = new Map(groups.map((group) => [group.id, group]));
	const unassignedGroup = buildUnassignedGroup();

	for (const participant of data.participants) {
		const primaryGroupId = participant.groupMemberships[0]?.groupId;
		const group = primaryGroupId
			? (groupById.get(primaryGroupId) ?? unassignedGroup)
			: unassignedGroup;
		const taskSummaries = getParticipantTaskSummaries(
			participant.reviewerAssignments,
			taskLookup,
		);

		for (const [taskId] of taskSummaries) {
			if (!group.tasks.has(taskId)) {
				const task = taskLookup.get(taskId);
				if (!task) {
					continue;
				}

				group.tasks.set(taskId, {
					...task,
					scheduledDates: [],
				});
			}
		}

		const tasks = Array.from(taskSummaries.values()).sort((left, right) =>
			left.taskId.localeCompare(right.taskId, "de-DE"),
		);

		for (const task of tasks) {
			group.taskCompletion.total += task.totalAssignments;
			group.taskCompletion.completed += task.completedAssignments;
		}

		group.participants.push({
			id: participant.id,
			name: participant.name,
			tasks,
		});
	}

	const resolvedGroups = groups
		.map((group) => ({
			id: group.id,
			name: group.name,
			tasks: sortGroupTasks(Array.from(group.tasks.values())),
			participants: group.participants.sort((left, right) =>
				left.name.localeCompare(right.name, "de-DE"),
			),
			completionPercent:
				group.taskCompletion.total === 0
					? 0
					: Math.round(
							(group.taskCompletion.completed / group.taskCompletion.total) *
								100,
						),
		}))
		.filter((group) => group.participants.length > 0 || group.tasks.length > 0);

	if (
		unassignedGroup.participants.length === 0 &&
		unassignedGroup.tasks.size === 0
	) {
		return resolvedGroups;
	}

	const unassignedCompletionPercent =
		unassignedGroup.taskCompletion.total === 0
			? 0
			: Math.round(
					(unassignedGroup.taskCompletion.completed /
						unassignedGroup.taskCompletion.total) *
						100,
				);

	return [
		...resolvedGroups,
		{
			id: unassignedGroup.id,
			name: unassignedGroup.name,
			tasks: sortGroupTasks(Array.from(unassignedGroup.tasks.values())),
			participants: unassignedGroup.participants.sort((left, right) =>
				left.name.localeCompare(right.name, "de-DE"),
			),
			completionPercent: unassignedCompletionPercent,
		},
	];
}

function buildSummary(
	data: QueryResult,
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	let totalAssignments = 0;
	let reviewableAssignments = 0;
	let completedAssignments = 0;
	let assignmentsWithoutCriteria = 0;

	for (const participant of data.participants) {
		for (const assignment of participant.reviewerAssignments) {
			const task = taskLookup.get(assignment.taskId);
			if (!task) {
				continue;
			}

			totalAssignments += 1;

			if (task.criteriaCount === 0) {
				assignmentsWithoutCriteria += 1;
				continue;
			}

			reviewableAssignments += 1;

			if (getCompletedCriteriaCount(assignment) >= task.criteriaCount) {
				completedAssignments += 1;
			}
		}
	}

	return {
		participantCount: data.participants.length,
		groupCount: data.groups.length,
		taskCount: data.tasks.length,
		dayCount: data.days.length,
		reviewerCount: data.reviewers.length,
		totalAssignments,
		reviewableAssignments,
		completedAssignments,
		unratedAssignments: reviewableAssignments - completedAssignments,
		assignmentsWithoutCriteria,
		completionPercent:
			reviewableAssignments === 0
				? 0
				: Math.round((completedAssignments / reviewableAssignments) * 100),
	};
}

export async function getEvaluationOverviewData(
	acId: string,
): Promise<EvaluationOverviewData> {
	const data = await fetchOverviewSourceData(acId);

	if (!data) {
		notFound();
	}

	const taskLookup = buildTaskLookup(data);

	return {
		summary: buildSummary(data, taskLookup),
		groups: buildGroups(data, taskLookup),
	};
}
