import "server-only";

import { notFound } from "next/navigation";
import {
	getAssignmentCompletion,
	type ReviewCompletionStatus,
} from "@/lib/review-completion";
import { db } from "@/server/db";
import { getReviewSession } from "./shared";

export type ReviewParticipantListData = {
	task: {
		id: string;
		name: string;
		isTeamTask: boolean;
		criteriaCount: number;
		requiredCriteriaCount: number;
	};
	participants: Array<{
		id: string;
		name: string;
		groupName: string | null;
		completedRequiredCount: number;
		requiredCriteriaCount: number;
		isComplete: boolean;
		status: ReviewCompletionStatus;
	}>;
};

export async function getReviewParticipantListData(
	acId: string,
	taskId: string,
): Promise<ReviewParticipantListData> {
	const reviewSession = await getReviewSession(acId);

	const assignments = await db.reviewerAssignment.findMany({
		where: { reviewerId: reviewSession.reviewerId, taskId },
		select: {
			participantId: true,
			participant: {
				select: {
					id: true,
					name: true,
					groupMemberships: {
						select: { group: { select: { name: true } } },
						orderBy: { createdAt: "asc" },
						take: 1,
					},
				},
			},
			task: {
				select: {
					id: true,
					name: true,
					isTeamTask: true,
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
		orderBy: { participant: { name: "asc" } },
	});

	const firstAssignment = assignments[0];
	if (!firstAssignment) {
		notFound();
	}

	const { criteria } = firstAssignment.task;

	return {
		task: {
			id: firstAssignment.task.id,
			name: firstAssignment.task.name,
			isTeamTask: firstAssignment.task.isTeamTask,
			criteriaCount: criteria.length,
			requiredCriteriaCount: getAssignmentCompletion(criteria, firstAssignment)
				.requiredCount,
		},
		participants: assignments.map((assignment) => {
			const completion = getAssignmentCompletion(criteria, assignment);

			return {
				id: assignment.participant.id,
				name: assignment.participant.name,
				groupName:
					assignment.participant.groupMemberships[0]?.group.name ?? null,
				completedRequiredCount: completion.completedRequiredCount,
				requiredCriteriaCount: completion.requiredCount,
				isComplete: completion.isComplete,
				status: completion.status,
			};
		}),
	};
}
