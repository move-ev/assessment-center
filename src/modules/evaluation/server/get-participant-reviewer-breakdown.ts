import "server-only";

import { db } from "@/server/db";
import {
	type CriterionRating,
	computeWeightedCriteriaScore,
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

export type ReviewerBreakdownData = {
	tasks: Array<{
		taskId: string;
		taskName: string;
	}>;
	reviewers: ReviewerEntry[];
};

/**
 * Task score per reviewer for one participant: the same weighted criteria
 * score as the ranking, computed from one reviewer's ratings only. Lists only
 * tasks the participant was assigned to that have scored criteria.
 */
export async function getParticipantReviewerBreakdown(
	acId: string,
	participantId: string,
): Promise<ReviewerBreakdownData> {
	const [acData, assignments] = await Promise.all([
		db.assessmentCenter.findFirst({
			where: { id: acId, deletedAt: null },
			select: {
				tasks: {
					where: { deletedAt: null },
					select: {
						id: true,
						name: true,
						criteria: {
							where: { deletedAt: null },
							select: { id: true, type: true, weight: true },
							orderBy: { createdAt: "asc" },
						},
					},
					orderBy: { createdAt: "asc" },
				},
			},
		}),
		db.reviewerAssignment.findMany({
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
			},
			orderBy: { createdAt: "asc" },
		}),
	]);

	if (!acData) {
		return { tasks: [], reviewers: [] };
	}

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
						? computeWeightedCriteriaScore(task.criteria, [ratings])
						: null,
				};
			}),
		}),
	);

	return {
		tasks: tasks.map(({ taskId, taskName }) => ({ taskId, taskName })),
		reviewers,
	};
}
