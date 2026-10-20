import { computeMean, roundScore } from "./scoring.ts";

export type ScoreSummary = {
	count: number;
	min: number;
	max: number;
	mean: number;
};

/** Lowest, highest and mean score of a group, e.g. one task across an AC. */
export function summarizeScores(scores: number[]): ScoreSummary | null {
	const mean = computeMean(scores);
	if (mean === null) {
		return null;
	}

	return {
		count: scores.length,
		min: Math.min(...scores),
		max: Math.max(...scores),
		mean,
	};
}

/**
 * 1-based position of a score among a group's scores (which include it):
 * one more than the number of higher scores, so ties share a position.
 */
export function getPositionAmong(
	score: number,
	scores: number[],
): { position: number; count: number } {
	return {
		position: 1 + scores.filter((other) => other > score).length,
		count: scores.length,
	};
}

/** Within this many points of the mean counts as average, not as above or below. */
export const AVERAGE_BAND_POINTS = 3;
/** More than this many points off the mean is a clear strength or weakness. */
export const STRONG_DEVIATION_POINTS = 10;

export type MeanTone =
	| "STRONG_ABOVE"
	| "ABOVE"
	| "AVERAGE"
	| "BELOW"
	| "STRONG_BELOW";

export type MeanComparison = {
	/** Percentage points above (+) or below (−) the mean. */
	delta: number;
	tone: MeanTone;
};

/**
 * How a score compares with the AC's mean: the question every chart of a
 * participant answers, so "good" and "bad" read the same everywhere.
 */
export function compareToMean(
	score: number | null,
	mean: number | null,
): MeanComparison | null {
	if (score === null || mean === null) {
		return null;
	}

	const delta = roundScore(score - mean);
	const distance = Math.abs(delta);
	if (distance <= AVERAGE_BAND_POINTS) {
		return { delta, tone: "AVERAGE" };
	}
	if (delta > 0) {
		return {
			delta,
			tone: distance > STRONG_DEVIATION_POINTS ? "STRONG_ABOVE" : "ABOVE",
		};
	}
	return {
		delta,
		tone: distance > STRONG_DEVIATION_POINTS ? "STRONG_BELOW" : "BELOW",
	};
}

/**
 * The clearest strengths (furthest above the mean) and weaknesses (furthest
 * below), at most `count` each; anything within the average band is neither.
 */
export function pickStrengthsAndWeaknesses<T extends { delta: number }>(
	items: T[],
	count: number,
): { strengths: T[]; weaknesses: T[] } {
	return {
		strengths: items
			.filter((item) => item.delta > AVERAGE_BAND_POINTS)
			.sort((left, right) => right.delta - left.delta)
			.slice(0, count),
		weaknesses: items
			.filter((item) => item.delta < -AVERAGE_BAND_POINTS)
			.sort((left, right) => left.delta - right.delta)
			.slice(0, count),
	};
}

/**
 * Pearson correlation of two tasks' scores over the people who have both:
 * 1 when they rise together, −1 when one falls as the other rises. Null
 * below three people or when one task gave everyone the same score.
 */
export function computeCorrelation(
	points: Array<{ x: number; y: number }>,
): number | null {
	if (points.length < 3) {
		return null;
	}

	const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
	const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
	let covariance = 0;
	let varianceX = 0;
	let varianceY = 0;

	for (const point of points) {
		covariance += (point.x - meanX) * (point.y - meanY);
		varianceX += (point.x - meanX) ** 2;
		varianceY += (point.y - meanY) ** 2;
	}

	return varianceX === 0 || varianceY === 0
		? null
		: roundScore(covariance / Math.sqrt(varianceX * varianceY));
}
