import "server-only";

import { getAssignmentCompletion } from "@/lib/review-completion";
import { db } from "@/server/db";
import { getReviewSession } from "./shared";

export type ReviewLayoutData = {
	reviewerName: string;
	totalAssignments: number;
	reviewableAssignments: number;
	completedAssignments: number;
	progressPercent: number;
	taskCount: number;
};

export async function getReviewLayoutData(
	acId: string,
): Promise<ReviewLayoutData> {
	const reviewSession = await getReviewSession(acId);

	const assignments = await db.reviewerAssignment.findMany({
		where: { reviewerId: reviewSession.reviewerId },
		select: {
			taskId: true,
			task: {
				select: {
					criteria: {
						where: { deletedAt: null },
						select: { id: true, type: true, isOptional: true },
					},
				},
			},
			quantitativeRatings: {
				where: { deletedAt: null },
				select: { criteriaId: true },
			},
			qualitativeRatings: {
				where: { deletedAt: null },
				select: { criteriaId: true },
			},
		},
	});

	let reviewableAssignments = 0;
	let completedAssignments = 0;

	for (const assignment of assignments) {
		if (assignment.task.criteria.length > 0) {
			reviewableAssignments += 1;
		}

		if (
			getAssignmentCompletion(assignment.task.criteria, assignment).isComplete
		) {
			completedAssignments += 1;
		}
	}

	return {
		reviewerName: reviewSession.reviewerName,
		totalAssignments: assignments.length,
		reviewableAssignments,
		completedAssignments,
		progressPercent:
			reviewableAssignments === 0
				? 0
				: Math.round((completedAssignments / reviewableAssignments) * 100),
		taskCount: new Set(assignments.map((assignment) => assignment.taskId)).size,
	};
}
