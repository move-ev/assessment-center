import "server-only";

import { db } from "@/server/db";
import {
	getCompletedCriteriaCount,
	getReviewSession,
	isAssignmentComplete,
} from "./shared";

export type ReviewTaskListItem = {
	id: string;
	name: string;
	isTeamTask: boolean;
	criteriaCount: number;
	participantCount: number;
	completedParticipantCount: number;
	progressPercent: number;
};

export async function getReviewTaskListData(
	acId: string,
): Promise<ReviewTaskListItem[]> {
	const reviewSession = await getReviewSession(acId);

	const assignments = await db.reviewerAssignment.findMany({
		where: { reviewerId: reviewSession.reviewerId },
		select: {
			taskId: true,
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
			participantId: true,
			quantitativeRatings: {
				where: { deletedAt: null },
				select: { criteriaId: true },
			},
			qualitativeRatings: {
				where: { deletedAt: null },
				select: { criteriaId: true },
			},
		},
		orderBy: [{ task: { createdAt: "asc" } }, { participant: { name: "asc" } }],
	});

	const taskMap = new Map<string, ReviewTaskListItem>();

	for (const assignment of assignments) {
		const criteriaCount = assignment.task.criteria.length;
		const current = taskMap.get(assignment.taskId) ?? {
			id: assignment.task.id,
			name: assignment.task.name,
			isTeamTask: assignment.task.isTeamTask,
			criteriaCount,
			participantCount: 0,
			completedParticipantCount: 0,
			progressPercent: 0,
		};

		current.participantCount += 1;

		if (
			isAssignmentComplete(criteriaCount, getCompletedCriteriaCount(assignment))
		) {
			current.completedParticipantCount += 1;
		}

		taskMap.set(assignment.taskId, current);
	}

	return Array.from(taskMap.values()).map((task) => ({
		...task,
		progressPercent:
			task.criteriaCount === 0 || task.participantCount === 0
				? 0
				: Math.round(
						(task.completedParticipantCount / task.participantCount) * 100,
					),
	}));
}
