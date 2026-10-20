import { roundScore } from "./scoring.ts";

/** Reviewers of one task may differ by this many percentage points. */
export const DEVIATION_THRESHOLD_POINTS = 7;

/**
 * Spread in percentage points between the highest and lowest reviewer of one
 * task. A single reviewer has nothing to deviate from, so there is no spread.
 */
export function computeReviewerSpread(
	reviewerPercents: number[],
): number | null {
	if (reviewerPercents.length < 2) {
		return null;
	}

	return roundScore(
		Math.max(...reviewerPercents) - Math.min(...reviewerPercents),
	);
}

/** More than the threshold apart; no spread (one reviewer) never counts. */
export function isStrongDeviation(spread: number | null): boolean {
	return spread !== null && spread > DEVIATION_THRESHOLD_POINTS;
}
