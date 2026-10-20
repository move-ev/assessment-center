import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getEvaluationResultsData } from "./get-evaluation-results-data";
import {
	getParticipantReviewerBreakdown,
	type ReviewerBreakdownData,
} from "./get-participant-reviewer-breakdown";
import type { RankingBand } from "./ranking";

export type EvaluationParticipantDetailData = {
	participant: {
		id: string;
		name: string;
		groupName: string | null;
		overallScore: number | null;
		/** 1-based position in the ranking, null without an overall score. */
		rank: number | null;
		/** Number of participants with an overall score. */
		rankedCount: number;
		rankingBand: RankingBand | null;
		/** Tasks whose reviewers differ strongly (Sonderfall 1). */
		deviatingTaskNames: string[];
		completedAssignmentCount: number;
		totalAssignmentCount: number;
	};
	taskScores: Array<{
		taskId: string;
		taskName: string;
		scoreWeight: number;
		score: number | null;
		reviewerSpread: number | null;
		hasStrongDeviation: boolean;
		completedAssignments: number;
		totalAssignments: number;
	}>;
	reviewerBreakdown: ReviewerBreakdownData;
	teamObservations: Array<{
		taskId: string;
		taskName: string;
		entries: Array<{
			reviewerName: string;
			notes: string;
			updatedAt: Date;
		}>;
	}>;
};

async function fetchParticipantGroupId(acId: string, participantId: string) {
	const membership = await db.participantGroupMembership.findFirst({
		where: {
			participantId,
			participant: {
				assessmentCenterId: acId,
				deletedAt: null,
			},
		},
		select: { groupId: true },
		orderBy: { createdAt: "asc" },
	});

	return membership?.groupId ?? null;
}

async function fetchTeamObservations(
	acId: string,
	groupId: string,
): Promise<EvaluationParticipantDetailData["teamObservations"]> {
	const observations = await db.teamTaskObservation.findMany({
		where: {
			groupId,
			deletedAt: null,
			notes: { not: null },
			task: {
				assessmentCenterId: acId,
				deletedAt: null,
				isTeamTask: true,
			},
		},
		select: {
			notes: true,
			updatedAt: true,
			task: {
				select: { id: true, name: true },
			},
			reviewer: {
				select: {
					user: { select: { name: true } },
				},
			},
		},
		orderBy: [{ task: { name: "asc" } }, { updatedAt: "asc" }],
	});

	const byTask = new Map<
		string,
		EvaluationParticipantDetailData["teamObservations"][number]
	>();

	for (const observation of observations) {
		if (observation.notes === null || observation.notes.trim() === "") {
			continue;
		}

		const bucket = byTask.get(observation.task.id) ?? {
			taskId: observation.task.id,
			taskName: observation.task.name,
			entries: [],
		};
		bucket.entries.push({
			reviewerName: observation.reviewer.user.name,
			notes: observation.notes,
			updatedAt: observation.updatedAt,
		});
		byTask.set(observation.task.id, bucket);
	}

	return Array.from(byTask.values());
}

/**
 * Reads the participant from the same results as the ranking, so overall
 * score, rank and task scores match the results page exactly. Trade-off: this
 * evaluates the whole AC to show one participant, which is fine at AC sizes.
 */
export async function getEvaluationParticipantDetailData(
	acId: string,
	participantId: string,
): Promise<EvaluationParticipantDetailData> {
	const [results, reviewerBreakdown, groupId] = await Promise.all([
		getEvaluationResultsData(acId),
		getParticipantReviewerBreakdown(acId, participantId),
		fetchParticipantGroupId(acId, participantId),
	]);

	const index = results.participants.findIndex(
		(entry) => entry.id === participantId,
	);
	const participant = results.participants[index];

	if (!participant) {
		notFound();
	}

	const teamObservations = groupId
		? await fetchTeamObservations(acId, groupId)
		: [];
	const breakdownTaskIds = new Set(
		reviewerBreakdown.tasks.map((task) => task.taskId),
	);

	return {
		participant: {
			id: participant.id,
			name: participant.name,
			groupName: participant.groupName,
			overallScore: participant.overallScore,
			rank: participant.overallScore === null ? null : index + 1,
			rankedCount: results.summary.participantsWithScore,
			rankingBand: participant.rankingBand,
			deviatingTaskNames: participant.deviatingTaskNames,
			completedAssignmentCount: participant.completedAssignmentCount,
			totalAssignmentCount: participant.totalAssignmentCount,
		},
		taskScores: participant.taskResults.map((task) => ({
			taskId: task.taskId,
			taskName: task.taskName,
			scoreWeight: task.scoreWeight,
			score: task.score,
			reviewerSpread: task.reviewerSpread,
			hasStrongDeviation: task.hasStrongDeviation,
			completedAssignments: task.completedAssignments,
			totalAssignments: task.totalAssignments,
		})),
		// Same task order as the task scores above.
		reviewerBreakdown: {
			...reviewerBreakdown,
			tasks: participant.taskResults
				.filter((task) => breakdownTaskIds.has(task.taskId))
				.map(({ taskId, taskName }) => ({ taskId, taskName })),
		},
		teamObservations,
	};
}
