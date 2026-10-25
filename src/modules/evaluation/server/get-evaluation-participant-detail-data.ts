import type { AssignedRessort } from "@/lib/ressort-assignment";
import "server-only";

import { notFound } from "next/navigation";
import type { RatingScaleMax } from "@/lib/rating-scale";
import { db } from "@/server/db";
import {
	getPositionAmong,
	type ScoreSummary,
	summarizeScores,
	type TaskContribution,
} from "./comparison";
import {
	type EvaluationResultsData,
	getEvaluationResultsData,
	type HypotheticalScore,
} from "./get-evaluation-results-data";
import {
	getParticipantReviewerBreakdown,
	type ReviewerBreakdownData,
} from "./get-participant-reviewer-breakdown";
import type { RankingBand } from "./ranking";

/** Where a score lies among all participants of the AC. */
export type ScoreComparison = {
	summary: ScoreSummary | null;
	/** Position among the participants with a score; null without a score. */
	position: number | null;
};

/** Hypothetical result under one reviewer, named with their effect. */
export type ReviewerScenario = HypotheticalScore & {
	reviewerName: string;
	effect: number;
};

/**
 * The person's results had one reviewer rated everyone: context for the
 * real result, never a replacement. Null without a real overall score.
 */
export type ParticipantHypothetical = {
	strictest: ReviewerScenario | null;
	averageReviewer: HypotheticalScore;
	mildest: ReviewerScenario | null;
	tasks: Array<{
		taskId: string;
		taskName: string;
		actualScore: number | null;
		/** Null while the task has no scored rating yet. */
		averageReviewerScore: number | null;
		reviewers: Array<{ reviewerName: string; effect: number | null }>;
	}>;
} | null;

export type EvaluationParticipantDetailData = {
	/** Highest star of the AC's scale, for the criteria drill-down. */
	ratingScaleMax: RatingScaleMax;
	/** Free texts were deleted when the AC was anonymized. */
	isAnonymized: boolean;
	participant: {
		id: string;
		name: string;
		groupName: string | null;
		ressort: AssignedRessort | null;
		overallScore: number | null;
		/** Rank in the ranking (shared on identical results); null without a score. */
		rank: number | null;
		/** Number of participants with an overall score. */
		rankedCount: number;
		rankingBand: RankingBand | null;
		/** Tasks whose reviewers differ strongly (Sonderfall 1). */
		deviatingTaskNames: string[];
		completedAssignmentCount: number;
		totalAssignmentCount: number;
		overallComparison: ScoreComparison;
		taskContributions: TaskContribution[];
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
	teamObservations: Array<{
		taskId: string;
		taskName: string;
		entries: Array<{
			reviewerName: string;
			notes: string;
			updatedAt: Date;
		}>;
	}>;
	hypothetical: ParticipantHypothetical;
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

	const participant = results.participants.find(
		(entry) => entry.id === participantId,
	);

	if (!participant) {
		notFound();
	}

	const teamObservations = groupId
		? await fetchTeamObservations(acId, groupId)
		: [];
	const overallScores = results.participants.flatMap((entry) =>
		entry.overallScore === null ? [] : [entry.overallScore],
	);
	const breakdownTaskIds = new Set(
		reviewerBreakdown.tasks.map((task) => task.taskId),
	);

	return {
		ratingScaleMax: results.ratingScaleMax,
		isAnonymized: results.isAnonymized,
		participant: {
			id: participant.id,
			name: participant.name,
			groupName: participant.groupName,
			ressort: participant.ressort,
			overallScore: participant.overallScore,
			rank: participant.rank,
			rankedCount: results.summary.participantsWithScore,
			rankingBand: participant.rankingBand,
			deviatingTaskNames: participant.deviatingTaskNames,
			completedAssignmentCount: participant.completedAssignmentCount,
			totalAssignmentCount: participant.totalAssignmentCount,
			// The ranking's position, so the profile matches "Rang X von N".
			overallComparison: {
				summary: summarizeScores(overallScores),
				position: participant.rank,
			},
			taskContributions: participant.taskContributions,
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
		criterionAverages: Object.fromEntries(
			results.criteria.map((criterion) => [
				criterion.id,
				criterion.averageScore,
			]),
		),
		teamObservations,
		hypothetical: buildParticipantHypothetical(results, participant),
	};
}

function buildParticipantHypothetical(
	results: EvaluationResultsData,
	participant: EvaluationResultsData["participants"][number],
): ParticipantHypothetical {
	const { hypothetical } = results.calibration;
	const row = hypothetical.participants.find(
		(entry) => entry.participantId === participant.id,
	);
	if (!row) {
		return null;
	}

	const scenario = (reviewerId: string | null): ReviewerScenario | null => {
		const reviewer = hypothetical.reviewers.find(
			(entry) => entry.reviewerId === reviewerId,
		);
		const score = reviewerId ? row.byReviewer[reviewerId] : undefined;
		return reviewer && score
			? {
					...score,
					reviewerName: reviewer.reviewerName,
					effect: reviewer.effect,
				}
			: null;
	};

	return {
		strictest: scenario(hypothetical.strictestReviewerId),
		averageReviewer: row.averageReviewer,
		mildest: scenario(hypothetical.mildestReviewerId),
		// Same task order as the task scores.
		tasks: participant.taskResults.map((task) => {
			const entry = row.tasks.find((item) => item.taskId === task.taskId);
			return {
				taskId: task.taskId,
				taskName: task.taskName,
				actualScore: task.score,
				averageReviewerScore: entry?.averageReviewerScore ?? null,
				reviewers: (entry?.reviewers ?? []).map(({ reviewerName, effect }) => ({
					reviewerName,
					effect,
				})),
			};
		}),
	};
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
	return {
		summary: summarizeScores(scores),
		position: score === null ? null : getPositionAmong(score, scores).position,
	};
}
