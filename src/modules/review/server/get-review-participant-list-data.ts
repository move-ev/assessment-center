import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import {
	getCompletedCriteriaCount,
	getReviewSession,
	isAssignmentComplete,
} from "./shared";

export type ReviewParticipantListData = {
	task: {
		id: string;
		name: string;
		isTeamTask: boolean;
		criteriaCount: number;
	};
	participants: Array<{
		id: string;
		name: string;
		groupName: string | null;
		completedCriteriaCount: number;
		criteriaCount: number;
		isComplete: boolean;
		status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NO_CRITERIA";
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
						select: { id: true },
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

	const criteriaCount = firstAssignment.task.criteria.length;

	return {
		task: {
			id: firstAssignment.task.id,
			name: firstAssignment.task.name,
			isTeamTask: firstAssignment.task.isTeamTask,
			criteriaCount,
		},
		participants: assignments.map((assignment) => {
			const completedCriteriaCount = getCompletedCriteriaCount(assignment);
			const isComplete = isAssignmentComplete(
				criteriaCount,
				completedCriteriaCount,
			);

			return {
				id: assignment.participant.id,
				name: assignment.participant.name,
				groupName:
					assignment.participant.groupMemberships[0]?.group.name ?? null,
				completedCriteriaCount,
				criteriaCount,
				isComplete,
				status: getParticipantStatus(criteriaCount, completedCriteriaCount),
			};
		}),
	};
}

function getParticipantStatus(
	criteriaCount: number,
	completedCriteriaCount: number,
) {
	if (criteriaCount === 0) {
		return "NO_CRITERIA" as const;
	}

	if (completedCriteriaCount === 0) {
		return "NOT_STARTED" as const;
	}

	if (completedCriteriaCount >= criteriaCount) {
		return "COMPLETED" as const;
	}

	return "IN_PROGRESS" as const;
}
