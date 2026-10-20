import "server-only";

import { notFound } from "next/navigation";
import type { RatingScaleMax } from "@/lib/rating-scale";
import { db } from "@/server/db";
import {
	compareToMean,
	getPositionAmong,
	type MeanComparison,
	type ScoreSummary,
	summarizeScores,
} from "./comparison";
import {
	type EvaluationResultsData,
	getEvaluationResultsData,
} from "./get-evaluation-results-data";
import {
	getParticipantReviewerBreakdown,
	type ReviewerBreakdownData,
} from "./get-participant-reviewer-breakdown";
import type { RankingBand } from "./ranking";
import { getExpectationPercent, roundScore, starsToPercent } from "./scoring";

/** Where a score lies among all participants of the AC. */
export type ScoreComparison = {
	summary: ScoreSummary | null;
	/** Position among the participants with a score; null without a score. */
	position: number | null;
	/** Above, around or below the AC's mean; null without a score. */
	vsMean: MeanComparison | null;
};

/** One criterion of the person against the same criterion across the AC. */
export type CriterionComparison = {
	criteriaId: string;
	taskName: string;
	criteriaGroupTitle: string;
	name: string;
	/** Mean stars of the person's reviewers, in percent of the scale. */
	personPercent: number;
	/** Mean stars of everyone in the AC, in percent of the scale. */
	acPercent: number;
	delta: number;
};

export type EvaluationParticipantDetailData = {
	/** Highest star of the AC's scale, for the criteria drill-down. */
	ratingScaleMax: RatingScaleMax;
	/** Free texts were deleted when the AC was anonymized. */
	isAnonymized: boolean;
	/** "Erwartung erfüllt" (4 stars) in percent of the AC's scale. */
	expectationPercent: number;
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
		overallComparison: ScoreComparison;
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
		comparison: ScoreComparison;
	}>;
	reviewerBreakdown: ReviewerBreakdownData;
	/** Mean stars per criterion across the AC, for the criteria drill-down. */
	criterionAverages: Record<string, number | null>;
	/** Every rated criterion against the AC, for strengths and weaknesses. */
	criterionComparisons: CriterionComparison[];
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
	const overallScores = results.participants.flatMap((entry) =>
		entry.overallScore === null ? [] : [entry.overallScore],
	);
	const criterionAverages = Object.fromEntries(
		results.criteria.map((criterion) => [criterion.id, criterion.averageScore]),
	);
	const breakdownTaskIds = new Set(
		reviewerBreakdown.tasks.map((task) => task.taskId),
	);

	return {
		ratingScaleMax: results.ratingScaleMax,
		isAnonymized: results.isAnonymized,
		expectationPercent: getExpectationPercent(results.ratingScaleMax),
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
			// The ranking's position, so the profile matches "Rang X von N".
			overallComparison: {
				...compareScore(participant.overallScore, overallScores),
				position: participant.overallScore === null ? null : index + 1,
			},
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
			comparison: compareScore(
				task.score,
				getTaskScores(results.participants, task.taskId),
			),
		})),
		// Same task order as the task scores above.
		reviewerBreakdown: {
			...reviewerBreakdown,
			tasks: participant.taskResults
				.filter((task) => breakdownTaskIds.has(task.taskId))
				.map(({ taskId, taskName }) => ({ taskId, taskName })),
		},
		criterionAverages,
		criterionComparisons: compareCriteria(
			reviewerBreakdown,
			criterionAverages,
			results.ratingScaleMax,
		),
		teamObservations,
	};
}

function compareCriteria(
	breakdown: ReviewerBreakdownData,
	criterionAverages: Record<string, number | null>,
	scaleMax: RatingScaleMax,
): CriterionComparison[] {
	return breakdown.criteriaByTask.flatMap((task) =>
		task.criteria.flatMap((criterion) => {
			const acMean = criterionAverages[criterion.criteriaId];
			if (criterion.mean === null || acMean === null || acMean === undefined) {
				return [];
			}

			const personPercent = starsToPercent(criterion.mean, scaleMax);
			const acPercent = starsToPercent(acMean, scaleMax);
			return [
				{
					criteriaId: criterion.criteriaId,
					taskName: task.taskName,
					criteriaGroupTitle: criterion.criteriaGroupTitle,
					name: criterion.name,
					personPercent,
					acPercent,
					delta: roundScore(personPercent - acPercent),
				},
			];
		}),
	);
}

function getTaskScores(
	participants: EvaluationResultsData["participants"],
	taskId: string,
): number[] {
	return participants.flatMap((participant) => {
		const score = participant.taskResults.find(
			(task) => task.taskId === taskId,
		)?.score;
		return score === null || score === undefined ? [] : [score];
	});
}

function compareScore(score: number | null, scores: number[]): ScoreComparison {
	const summary = summarizeScores(scores);
	return {
		summary,
		position: score === null ? null : getPositionAmong(score, scores).position,
		vsMean: compareToMean(score, summary?.mean ?? null),
	};
}
