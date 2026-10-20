import type { RatingScaleMax } from "../../../lib/rating-scale.ts";

export function roundScore(value: number): number {
	return Number(value.toFixed(2));
}

export type WeightedCriterion = {
	id: string;
	weight: number;
};

/**
 * The criteria that make up a task score: quantitative criteria with a
 * weight. Callers pass the task's non-deleted criteria ordered by creation,
 * so every page sums the same weights in the same order.
 */
export function getScoredCriteria(
	criteria: Array<{
		id: string;
		type: "QUANTITATIVE" | "QUALITATIVE";
		weight: number | null;
	}>,
): WeightedCriterion[] {
	return criteria.flatMap((criterion) =>
		criterion.type === "QUANTITATIVE" && criterion.weight !== null
			? [{ id: criterion.id, weight: criterion.weight }]
			: [],
	);
}

export type CriterionRating = {
	criteriaId: string;
	value: number;
};

/**
 * One reviewer's score for one task in percent: weighted stars divided by
 * the weighted maximum of the AC's scale, as in the assessment matrix.
 */
export function computeReviewerPercent(
	criteria: WeightedCriterion[],
	ratings: CriterionRating[],
	scaleMax: RatingScaleMax,
): number | null {
	let weightedPoints = 0;
	let reachablePoints = 0;

	for (const criterion of criteria) {
		const rating = ratings.find((entry) => entry.criteriaId === criterion.id);
		if (!rating) {
			continue;
		}

		weightedPoints += rating.value * criterion.weight;
		reachablePoints += scaleMax * criterion.weight;
	}

	return reachablePoints === 0
		? null
		: roundScore((weightedPoints / reachablePoints) * 100);
}

/**
 * One percentage per reviewer (rating set) for a task; reviewers who have not
 * rated any scored criterion are left out.
 */
export function computeReviewerPercents(
	criteria: WeightedCriterion[],
	ratingSets: CriterionRating[][],
	scaleMax: RatingScaleMax,
): number[] {
	return ratingSets
		.map((ratings) => computeReviewerPercent(criteria, ratings, scaleMax))
		.filter((percent) => percent !== null);
}

/** Rounded mean of any values (percent, stars, points); null without any. */
export function computeMean(values: number[]): number | null {
	return values.length === 0
		? null
		: roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Mean of reviewer percentages; null without any. */
export function computeMeanPercent(percentages: number[]): number | null {
	return computeMean(percentages);
}

export type WeightedScore = {
	score: number | null;
	weight: number;
};

/**
 * Weighted mean over already computed scores. Entries without a score or
 * with a non-positive weight are left out of both sums.
 */
export function computeWeightedMean(entries: WeightedScore[]): number | null {
	let weightedValueSum = 0;
	let weightSum = 0;

	for (const entry of entries) {
		if (entry.score === null || entry.weight <= 0) {
			continue;
		}

		weightedValueSum += entry.score * entry.weight;
		weightSum += entry.weight;
	}

	return weightSum === 0 ? null : roundScore(weightedValueSum / weightSum);
}
