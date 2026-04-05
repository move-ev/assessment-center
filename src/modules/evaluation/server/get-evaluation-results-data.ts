import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { isAssignmentComplete, roundScore } from "./shared";

type QuantitativeRatingRecord = {
	criteriaId: string;
	value: number;
};

type QualitativeRatingRecord = {
	criteriaId: string;
};

type AssignmentRecord = {
	participantId: string;
	taskId: string;
	quantitativeRatings: QuantitativeRatingRecord[];
	qualitativeRatings: QualitativeRatingRecord[];
};

type TaskDefinition = {
	id: string;
	name: string;
	isTeamTask: boolean;
	criteria: Array<{
		id: string;
		name: string;
		type: "QUANTITATIVE" | "QUALITATIVE";
		weight: number | null;
	}>;
	teamObservations: Array<{
		groupId: string;
		reviewerId: string;
	}>;
};

type QueryResult = NonNullable<
	Awaited<ReturnType<typeof fetchEvaluationResultsSourceData>>
>;

type ParticipantTaskResult = {
	taskId: string;
	taskName: string;
	isTeamTask: boolean;
	score: number | null;
	totalAssignments: number;
	completedAssignments: number;
	qualitativeEntries: number;
	teamObservationCount: number;
};

type ParticipantResult = {
	id: string;
	name: string;
	groupName: string | null;
	overallScore: number | null;
	completedTaskCount: number;
	totalTaskCount: number;
	completedAssignmentCount: number;
	totalAssignmentCount: number;
	qualitativeEntries: number;
	teamObservationCount: number;
	taskResults: ParticipantTaskResult[];
};

type TaskResult = {
	id: string;
	name: string;
	isTeamTask: boolean;
	participantCount: number;
	reviewerAssignmentCount: number;
	completedAssignmentCount: number;
	averageScore: number | null;
	qualitativeEntryCount: number;
	teamObservationCount: number;
};

export type EvaluationCriterionResult = {
	id: string;
	taskId: string;
	taskName: string;
	name: string;
	type: "QUANTITATIVE" | "QUALITATIVE";
	weight: number | null;
	averageScore: number | null;
	ratingCount: number;
	textEntryCount: number;
};

export type EvaluationResultsData = {
	summary: {
		participantCount: number;
		taskCount: number;
		reviewerCount: number;
		totalAssignments: number;
		completedAssignments: number;
		completionPercent: number;
		averageOverallScore: number | null;
		participantsWithScore: number;
		qualitativeEntries: number;
		teamObservationCount: number;
	};
	participants: ParticipantResult[];
	tasks: TaskResult[];
	criteria: EvaluationCriterionResult[];
	exportRows: Array<Record<string, string>>;
};

async function fetchEvaluationResultsSourceData(acId: string) {
	return db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: {
			id: true,
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
						select: {
							id: true,
							name: true,
							type: true,
							weight: true,
						},
						orderBy: { createdAt: "asc" },
					},
					teamObservations: {
						where: { deletedAt: null },
						select: {
							groupId: true,
							reviewerId: true,
						},
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
						select: {
							group: {
								select: {
									id: true,
									name: true,
								},
							},
						},
						orderBy: { createdAt: "asc" },
						take: 1,
					},
					reviewerAssignments: {
						where: {
							reviewer: {
								assessmentCenterId: acId,
							},
						},
						select: {
							participantId: true,
							taskId: true,
							quantitativeRatings: {
								where: { deletedAt: null },
								select: {
									criteriaId: true,
									value: true,
								},
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

function buildTaskLookup(data: QueryResult) {
	return new Map(data.tasks.map((task) => [task.id, task]));
}

function buildCriterionResults(data: QueryResult) {
	const results: EvaluationCriterionResult[] = [];

	for (const task of data.tasks) {
		for (const criteria of task.criteria) {
			const quantitativeValues: number[] = [];
			let textEntryCount = 0;

			for (const participant of data.participants) {
				for (const assignment of participant.reviewerAssignments) {
					if (assignment.taskId !== task.id) {
						continue;
					}

					if (criteria.type === "QUANTITATIVE") {
						for (const rating of assignment.quantitativeRatings) {
							if (rating.criteriaId === criteria.id) {
								quantitativeValues.push(rating.value);
							}
						}
						continue;
					}

					for (const rating of assignment.qualitativeRatings) {
						if (rating.criteriaId === criteria.id) {
							textEntryCount += 1;
						}
					}
				}
			}

			results.push({
				id: criteria.id,
				taskId: task.id,
				taskName: task.name,
				name: criteria.name,
				type: criteria.type,
				weight: criteria.weight,
				averageScore:
					quantitativeValues.length === 0
						? null
						: roundScore(
								quantitativeValues.reduce((sum, value) => sum + value, 0) /
									quantitativeValues.length,
							),
				ratingCount: quantitativeValues.length,
				textEntryCount,
			});
		}
	}

	return results.sort((left, right) => {
		const taskComparison = left.taskName.localeCompare(right.taskName, "de-DE");
		if (taskComparison !== 0) {
			return taskComparison;
		}

		return left.name.localeCompare(right.name, "de-DE");
	});
}

function buildParticipantTaskResult(
	assignments: AssignmentRecord[],
	taskDefinition: TaskDefinition,
	groupId: string | null,
) {
	if (assignments.length === 0) {
		return null;
	}

	const quantitativeCriteria = taskDefinition.criteria.filter(
		(criteria) => criteria.type === "QUANTITATIVE" && criteria.weight !== null,
	);
	let weightedValueSum = 0;
	let weightSum = 0;
	let completedAssignments = 0;
	let qualitativeEntries = 0;

	for (const assignment of assignments) {
		if (isAssignmentComplete(assignment, taskDefinition.criteria.length)) {
			completedAssignments += 1;
		}

		qualitativeEntries += assignment.qualitativeRatings.length;
	}

	for (const criteria of quantitativeCriteria) {
		const values: number[] = [];

		for (const assignment of assignments) {
			for (const rating of assignment.quantitativeRatings) {
				if (rating.criteriaId === criteria.id) {
					values.push(rating.value);
				}
			}
		}

		if (values.length === 0) {
			continue;
		}

		const weight = criteria.weight;
		if (weight === null) {
			continue;
		}

		const averageValue =
			values.reduce((sum, value) => sum + value, 0) / values.length;
		weightedValueSum += averageValue * weight;
		weightSum += weight;
	}

	const teamObservationCount = groupId
		? taskDefinition.teamObservations.filter(
				(observation) => observation.groupId === groupId,
			).length
		: 0;

	return {
		taskId: taskDefinition.id,
		taskName: taskDefinition.name,
		isTeamTask: taskDefinition.isTeamTask,
		score: weightSum === 0 ? null : roundScore(weightedValueSum / weightSum),
		totalAssignments: assignments.length,
		completedAssignments,
		qualitativeEntries,
		teamObservationCount,
	} satisfies ParticipantTaskResult;
}

function sortParticipantTaskResults(results: ParticipantTaskResult[]) {
	return results.sort((left, right) => {
		if (left.score === null && right.score !== null) {
			return 1;
		}

		if (left.score !== null && right.score === null) {
			return -1;
		}

		return left.taskName.localeCompare(right.taskName, "de-DE");
	});
}

function buildParticipantResults(
	data: QueryResult,
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	const participants: ParticipantResult[] = [];

	for (const participant of data.participants) {
		const group = participant.groupMemberships[0]?.group ?? null;
		const assignmentsByTask = new Map<string, AssignmentRecord[]>();

		for (const assignment of participant.reviewerAssignments) {
			const taskAssignments = assignmentsByTask.get(assignment.taskId) ?? [];
			taskAssignments.push(assignment);
			assignmentsByTask.set(assignment.taskId, taskAssignments);
		}

		const taskResults = Array.from(assignmentsByTask.entries())
			.map(([taskId, assignments]) => {
				const taskDefinition = taskLookup.get(taskId);
				if (!taskDefinition) {
					return null;
				}

				return buildParticipantTaskResult(
					assignments,
					taskDefinition,
					group?.id ?? null,
				);
			})
			.filter((result) => result !== null);

		const sortedTaskResults = sortParticipantTaskResults(taskResults);
		let weightedScoreSum = 0;
		let weightedScoreWeight = 0;
		let completedTaskCount = 0;
		let completedAssignmentCount = 0;
		let totalAssignmentCount = 0;
		let qualitativeEntries = 0;
		let teamObservationCount = 0;

		for (const taskResult of sortedTaskResults) {
			completedAssignmentCount += taskResult.completedAssignments;
			totalAssignmentCount += taskResult.totalAssignments;
			qualitativeEntries += taskResult.qualitativeEntries;
			teamObservationCount += taskResult.teamObservationCount;

			if (taskResult.completedAssignments === taskResult.totalAssignments) {
				completedTaskCount += 1;
			}

			const taskDefinition = taskLookup.get(taskResult.taskId);
			const quantitativeWeight = taskDefinition?.criteria.reduce(
				(sum, criteria) => {
					const weight = criteria.weight;
					if (criteria.type !== "QUANTITATIVE" || weight === null) {
						return sum;
					}

					return sum + weight;
				},
				0,
			);

			if (taskResult.score === null || !quantitativeWeight) {
				continue;
			}

			weightedScoreSum += taskResult.score * quantitativeWeight;
			weightedScoreWeight += quantitativeWeight;
		}

		participants.push({
			id: participant.id,
			name: participant.name,
			groupName: group?.name ?? null,
			overallScore:
				weightedScoreWeight === 0
					? null
					: roundScore(weightedScoreSum / weightedScoreWeight),
			completedTaskCount,
			totalTaskCount: sortedTaskResults.length,
			completedAssignmentCount,
			totalAssignmentCount,
			qualitativeEntries,
			teamObservationCount,
			taskResults: sortedTaskResults,
		});
	}

	return participants.sort((left, right) => {
		if (left.overallScore === null && right.overallScore !== null) {
			return 1;
		}

		if (left.overallScore !== null && right.overallScore === null) {
			return -1;
		}

		if (left.overallScore !== null && right.overallScore !== null) {
			return right.overallScore - left.overallScore;
		}

		return left.name.localeCompare(right.name, "de-DE");
	});
}

function buildTaskResults(
	data: QueryResult,
	participants: ParticipantResult[],
) {
	return data.tasks
		.map((task) => {
			let reviewerAssignmentCount = 0;
			let completedAssignmentCount = 0;
			let qualitativeEntryCount = 0;
			const participantScores: number[] = [];
			let participantCount = 0;

			for (const participant of data.participants) {
				const assignments = participant.reviewerAssignments.filter(
					(assignment) => assignment.taskId === task.id,
				);

				if (assignments.length === 0) {
					continue;
				}

				participantCount += 1;
				reviewerAssignmentCount += assignments.length;
				qualitativeEntryCount += assignments.reduce(
					(sum, assignment) => sum + assignment.qualitativeRatings.length,
					0,
				);

				for (const assignment of assignments) {
					if (isAssignmentComplete(assignment, task.criteria.length)) {
						completedAssignmentCount += 1;
					}
				}

				const participantTask = participants
					.find((entry) => entry.id === participant.id)
					?.taskResults.find((entry) => entry.taskId === task.id);

				if (
					participantTask?.score !== null &&
					participantTask?.score !== undefined
				) {
					participantScores.push(participantTask.score);
				}
			}

			return {
				id: task.id,
				name: task.name,
				isTeamTask: task.isTeamTask,
				participantCount,
				reviewerAssignmentCount,
				completedAssignmentCount,
				averageScore:
					participantScores.length === 0
						? null
						: roundScore(
								participantScores.reduce((sum, value) => sum + value, 0) /
									participantScores.length,
							),
				qualitativeEntryCount,
				teamObservationCount: task.teamObservations.length,
			} satisfies TaskResult;
		})
		.sort((left, right) => left.name.localeCompare(right.name, "de-DE"));
}

function formatScore(value: number | null) {
	return value === null ? "n/a" : value.toFixed(2).replace(".", ",");
}

function buildExportRows(
	participants: ParticipantResult[],
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	return participants.map((participant, index) => {
		const row: Record<string, string> = {
			Rang: (index + 1).toString(),
			Teilnehmer: participant.name,
			Gruppe: participant.groupName ?? "Keine Gruppe",
			Gesamtwert: formatScore(participant.overallScore),
			Abgeschlossene_Aufgaben: `${participant.completedTaskCount}/${participant.totalTaskCount}`,
			Abgeschlossene_Bewertungen: `${participant.completedAssignmentCount}/${participant.totalAssignmentCount}`,
			Qualitative_Eintraege: participant.qualitativeEntries.toString(),
			Teambeobachtungen: participant.teamObservationCount.toString(),
		};

		for (const task of taskLookup.values()) {
			const taskResult = participant.taskResults.find(
				(entry) => entry.taskId === task.id,
			);
			row[`Aufgabe_${task.name}`] = formatScore(taskResult?.score ?? null);
		}

		return row;
	});
}

function buildSummary(data: QueryResult, participants: ParticipantResult[]) {
	let totalAssignments = 0;
	let completedAssignments = 0;
	let qualitativeEntries = 0;
	let teamObservationCount = 0;
	const scoredParticipants = participants.filter(
		(participant) => participant.overallScore !== null,
	);

	for (const participant of data.participants) {
		for (const assignment of participant.reviewerAssignments) {
			totalAssignments += 1;
			qualitativeEntries += assignment.qualitativeRatings.length;
		}
	}

	for (const participant of participants) {
		completedAssignments += participant.completedAssignmentCount;
		teamObservationCount += participant.teamObservationCount;
	}

	return {
		participantCount: data.participants.length,
		taskCount: data.tasks.length,
		reviewerCount: data.reviewers.length,
		totalAssignments,
		completedAssignments,
		completionPercent:
			totalAssignments === 0
				? 0
				: Math.round((completedAssignments / totalAssignments) * 100),
		averageOverallScore:
			scoredParticipants.length === 0
				? null
				: roundScore(
						scoredParticipants.reduce(
							(sum, participant) => sum + (participant.overallScore ?? 0),
							0,
						) / scoredParticipants.length,
					),
		participantsWithScore: scoredParticipants.length,
		qualitativeEntries,
		teamObservationCount,
	};
}

export async function getEvaluationResultsData(
	acId: string,
): Promise<EvaluationResultsData> {
	const data = await fetchEvaluationResultsSourceData(acId);

	if (!data) {
		notFound();
	}

	const taskLookup = buildTaskLookup(data);
	const participants = buildParticipantResults(data, taskLookup);

	return {
		summary: buildSummary(data, participants),
		participants,
		tasks: buildTaskResults(data, participants),
		criteria: buildCriterionResults(data),
		exportRows: buildExportRows(participants, taskLookup),
	};
}
