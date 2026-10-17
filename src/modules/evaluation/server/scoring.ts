export function roundScore(value: number): number {
	return Number(value.toFixed(2));
}

export type WeightedCriterion = {
	id: string;
	weight: number;
};

export type CriterionRating = {
	criteriaId: string;
	value: number;
};

/**
 * Averages each criterion's ratings across all rating sets (one set per
 * reviewer assignment), then weights those averages across criteria.
 * Criteria without any rating are left out of both sums.
 */
export function computeWeightedCriteriaScore(
	criteria: WeightedCriterion[],
	ratingSets: CriterionRating[][],
): number | null {
	let weightedValueSum = 0;
	let weightSum = 0;

	for (const criterion of criteria) {
		const values: number[] = [];

		for (const ratings of ratingSets) {
			for (const rating of ratings) {
				if (rating.criteriaId === criterion.id) {
					values.push(rating.value);
				}
			}
		}

		if (values.length === 0) {
			continue;
		}

		const averageValue =
			values.reduce((sum, value) => sum + value, 0) / values.length;
		weightedValueSum += averageValue * criterion.weight;
		weightSum += criterion.weight;
	}

	return weightSum === 0 ? null : roundScore(weightedValueSum / weightSum);
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
