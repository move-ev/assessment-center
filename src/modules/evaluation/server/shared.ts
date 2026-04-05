export function roundScore(value: number) {
	return Number(value.toFixed(2));
}

export function getCompletedCriteriaCount(input: {
	quantitativeRatings: Array<{ criteriaId: string }>;
	qualitativeRatings: Array<{ criteriaId: string }>;
}) {
	const completedCriteriaIds = new Set<string>();

	for (const rating of input.quantitativeRatings) {
		completedCriteriaIds.add(rating.criteriaId);
	}

	for (const rating of input.qualitativeRatings) {
		completedCriteriaIds.add(rating.criteriaId);
	}

	return completedCriteriaIds.size;
}

export function isAssignmentComplete(
	input: {
		quantitativeRatings: Array<{ criteriaId: string }>;
		qualitativeRatings: Array<{ criteriaId: string }>;
	},
	criteriaCount: number,
) {
	return criteriaCount > 0 && getCompletedCriteriaCount(input) >= criteriaCount;
}
