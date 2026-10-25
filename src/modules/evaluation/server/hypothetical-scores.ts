import type { ReviewerTaskPercent } from "./calibration.ts";
import { computeWeightedMean, roundScore } from "./scoring.ts";

/**
 * Ratings a reviewer's effect is pulled towards 0 with, as if they had this
 * many extra shared ratings exactly in line with the others. Keeps a
 * reviewer with one or two comparisons from looking extreme.
 */
export const SHRINKAGE_RATINGS = 3;

const MAX_ITERATIONS = 500;
const CONVERGENCE_POINTS = 1e-6;

export type ReviewerEffect = {
	reviewerId: string;
	/**
	 * Percentage points this reviewer gives above (+) or below (−) the
	 * average reviewer; null without a shared rating to estimate it from.
	 */
	effect: number | null;
	/** Ratings that had at least one other reviewer to compare with. */
	comparisonCount: number;
};

export type AverageReviewerTaskScore = {
	participantId: string;
	taskId: string;
	/** Task score the average reviewer would have given; unrounded. */
	score: number;
};

export type ReviewerEffectEstimate = {
	reviewers: ReviewerEffect[];
	taskScores: AverageReviewerTaskScore[];
};

function cellKey(entry: { participantId: string; taskId: string }): string {
	return `${entry.participantId}\u0000${entry.taskId}`;
}

/**
 * Splits each reviewer percentage into the person's task score and a shift
 * per reviewer, the same in every task: percent = score + effect. Fitted by
 * alternating least squares; effects are shrunk towards 0 and centred, so
 * the average reviewer has effect 0. Only ratings shared with another
 * reviewer inform an effect, as in the leniency.
 */
export function estimateReviewerEffects(
	percents: ReviewerTaskPercent[],
): ReviewerEffectEstimate {
	const cells = new Map<string, ReviewerTaskPercent[]>();
	for (const entry of percents) {
		const key = cellKey(entry);
		cells.set(key, [...(cells.get(key) ?? []), entry]);
	}

	const sharedByReviewer = new Map<string, ReviewerTaskPercent[]>();
	for (const cell of cells.values()) {
		if (cell.length < 2) {
			continue;
		}
		for (const entry of cell) {
			sharedByReviewer.set(entry.reviewerId, [
				...(sharedByReviewer.get(entry.reviewerId) ?? []),
				entry,
			]);
		}
	}

	const effects = new Map<string, number>(
		[...sharedByReviewer.keys()].map((reviewerId) => [reviewerId, 0]),
	);
	const effectOf = (reviewerId: string) => effects.get(reviewerId) ?? 0;
	const scores = new Map<string, number>();
	const fitScores = () => {
		for (const [key, cell] of cells) {
			scores.set(
				key,
				cell.reduce(
					(sum, entry) => sum + entry.percent - effectOf(entry.reviewerId),
					0,
				) / cell.length,
			);
		}
	};

	for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
		fitScores();
		let largestChange = 0;
		for (const [reviewerId, shared] of sharedByReviewer) {
			const residualSum = shared.reduce(
				(sum, entry) => sum + entry.percent - (scores.get(cellKey(entry)) ?? 0),
				0,
			);
			const next = residualSum / (shared.length + SHRINKAGE_RATINGS);
			largestChange = Math.max(
				largestChange,
				Math.abs(next - effectOf(reviewerId)),
			);
			effects.set(reviewerId, next);
		}
		if (largestChange < CONVERGENCE_POINTS) {
			break;
		}
	}

	// The average reviewer is the mean of the estimated effects, so centre
	// them; the scores take up the shift and the fit stays the same.
	const centre =
		effects.size === 0
			? 0
			: [...effects.values()].reduce((sum, effect) => sum + effect, 0) /
				effects.size;
	for (const [reviewerId, effect] of effects) {
		effects.set(reviewerId, effect - centre);
	}
	fitScores();

	const reviewerIds = [...new Set(percents.map((entry) => entry.reviewerId))];

	return {
		reviewers: reviewerIds.map((reviewerId) => {
			const effect = effects.get(reviewerId);
			return {
				reviewerId,
				effect: effect === undefined ? null : roundScore(effect),
				comparisonCount: sharedByReviewer.get(reviewerId)?.length ?? 0,
			};
		}),
		taskScores: [...cells.entries()].map(([key, [first]]) => ({
			participantId: first?.participantId ?? "",
			taskId: first?.taskId ?? "",
			score: scores.get(key) ?? 0,
		})),
	};
}

function clampPercent(value: number): number {
	return Math.min(100, Math.max(0, value));
}

/**
 * Overall score of each person had every task been rated by one reviewer
 * with the given effect: the average reviewer's task scores shifted by it,
 * kept within 0–100 %, weighted like the real overall score.
 */
export function computeHypotheticalOverallScores(
	taskScores: AverageReviewerTaskScore[],
	taskWeights: Map<string, number>,
	effect: number,
): Map<string, number | null> {
	const byParticipant = new Map<string, AverageReviewerTaskScore[]>();
	for (const entry of taskScores) {
		byParticipant.set(entry.participantId, [
			...(byParticipant.get(entry.participantId) ?? []),
			entry,
		]);
	}

	return new Map(
		[...byParticipant].map(([participantId, entries]) => [
			participantId,
			computeWeightedMean(
				entries.map((entry) => ({
					score: clampPercent(entry.score + effect),
					weight: taskWeights.get(entry.taskId) ?? 0,
				})),
			),
		]),
	);
}
