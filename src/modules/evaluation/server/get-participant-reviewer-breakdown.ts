import "server-only";

import { assertRatingScaleMax } from "@/lib/rating-scale";
import { db } from "@/server/db";
import { buildCriterionRows, type CriterionRow } from "./criteria-breakdown";
import {
	type CriterionRating,
	computeReviewerPercent,
	getScoredCriteria,
} from "./scoring";

export type ReviewerTaskScore = {
	taskId: string;
	score: number | null;
};

export type ReviewerEntry = {
	reviewerId: string;
	reviewerName: string;
	scores: ReviewerTaskScore[];
};

export type BreakdownCriterion = CriterionRow & {
	name: string;
	criteriaGroupTitle: string;
	type: "QUANTITATIVE" | "QUALITATIVE";
	weight: number | null;
	isOptional: boolean;
	anchorStar2: string | null;
	anchorStar4: string | null;
};

export type TaskCriteriaBreakdown = {
	taskId: string;
	taskName: string;
	/** The reviewers of this task, in the order of each row's values. */
	reviewers: Array<{ reviewerId: string; reviewerName: string }>;
	criteria: BreakdownCriterion[];
};

export type ReviewerBreakdownData = {
	tasks: Array<{
		taskId: string;
		taskName: string;
	}>;
	reviewers: ReviewerEntry[];
	/** Stars and written feedback per criterion, for every assigned task. */
	criteriaByTask: TaskCriteriaBreakdown[];
};

function fetchAcCriteria(acId: string) {
	return db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: {
			ratingScaleMax: true,
			tasks: {
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					criteria: {
						where: { deletedAt: null },
						select: {
							id: true,
							name: true,
							type: true,
							weight: true,
							isOptional: true,
							anchorStar2: true,
							anchorStar4: true,
							criteriaGroup: { select: { title: true } },
						},
						orderBy: { createdAt: "asc" },
					},
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});
}

function fetchParticipantAssignments(acId: string, participantId: string) {
	return db.reviewerAssignment.findMany({
		where: {
			participantId,
			reviewer: { assessmentCenterId: acId },
		},
		select: {
			taskId: true,
			reviewer: {
				select: {
					id: true,
					user: { select: { name: true } },
				},
			},
			quantitativeRatings: {
				where: { deletedAt: null },
				select: { criteriaId: true, value: true },
			},
			qualitativeRatings: {
				where: { deletedAt: null },
				select: { criteriaId: true, text: true },
			},
		},
		orderBy: { createdAt: "asc" },
	});
}

type AcData = Awaited<ReturnType<typeof fetchAcCriteria>>;
type AssignmentData = Awaited<
	ReturnType<typeof fetchParticipantAssignments>
>[number];

/**
 * Task score per reviewer for one participant in percent: the reviewer
 * percentage that the ranking averages per task. Lists only
 * tasks the participant was assigned to that have scored criteria.
 */
export async function getParticipantReviewerBreakdown(
	acId: string,
	participantId: string,
): Promise<ReviewerBreakdownData> {
	const [acData, assignments] = await Promise.all([
		fetchAcCriteria(acId),
		fetchParticipantAssignments(acId, participantId),
	]);

	if (!acData) {
		return { tasks: [], reviewers: [], criteriaByTask: [] };
	}

	const ratingScaleMax = assertRatingScaleMax(acData.ratingScaleMax);
	const assignedTaskIds = new Set(
		assignments.map((assignment) => assignment.taskId),
	);
	const tasks = acData.tasks.flatMap((task) => {
		const criteria = getScoredCriteria(task.criteria);

		return assignedTaskIds.has(task.id) && criteria.length > 0
			? [{ taskId: task.id, taskName: task.name, criteria }]
			: [];
	});

	const reviewerMap = new Map<
		string,
		{
			reviewerId: string;
			reviewerName: string;
			ratingsByTask: Map<string, CriterionRating[]>;
		}
	>();

	for (const assignment of assignments) {
		const { reviewer, taskId, quantitativeRatings } = assignment;
		const entry = reviewerMap.get(reviewer.id) ?? {
			reviewerId: reviewer.id,
			reviewerName: reviewer.user.name,
			ratingsByTask: new Map(),
		};

		entry.ratingsByTask.set(taskId, quantitativeRatings);
		reviewerMap.set(reviewer.id, entry);
	}

	const reviewers: ReviewerEntry[] = Array.from(reviewerMap.values()).map(
		(reviewer) => ({
			reviewerId: reviewer.reviewerId,
			reviewerName: reviewer.reviewerName,
			scores: tasks.map((task) => {
				const ratings = reviewer.ratingsByTask.get(task.taskId);

				return {
					taskId: task.taskId,
					score: ratings
						? computeReviewerPercent(task.criteria, ratings, ratingScaleMax)
						: null,
				};
			}),
		}),
	);

	return {
		tasks: tasks.map(({ taskId, taskName }) => ({ taskId, taskName })),
		reviewers,
		criteriaByTask: buildCriteriaByTask(acData.tasks, assignments),
	};
}

function buildCriteriaByTask(
	tasks: NonNullable<AcData>["tasks"],
	assignments: AssignmentData[],
): TaskCriteriaBreakdown[] {
	return tasks.flatMap((task) => {
		const taskAssignments = assignments
			.filter((assignment) => assignment.taskId === task.id)
			.map((assignment) => ({
				reviewerId: assignment.reviewer.id,
				reviewerName: assignment.reviewer.user.name,
				quantitativeRatings: assignment.quantitativeRatings,
				qualitativeRatings: assignment.qualitativeRatings,
			}));

		if (taskAssignments.length === 0 || task.criteria.length === 0) {
			return [];
		}

		return [
			{
				taskId: task.id,
				taskName: task.name,
				reviewers: taskAssignments.map(({ reviewerId, reviewerName }) => ({
					reviewerId,
					reviewerName,
				})),
				criteria: buildCriterionRows(task.criteria, taskAssignments).map(
					({ criterion, ...row }) => ({
						...row,
						name: criterion.name,
						criteriaGroupTitle: criterion.criteriaGroup.title,
						type: criterion.type,
						weight: criterion.weight,
						isOptional: criterion.isOptional,
						anchorStar2: criterion.anchorStar2,
						anchorStar4: criterion.anchorStar4,
					}),
				),
			},
		];
	});
}
