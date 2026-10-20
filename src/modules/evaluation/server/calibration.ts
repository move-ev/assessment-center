import { computeMean } from "./scoring.ts";

export type ReviewerTaskPercent = {
	reviewerId: string;
	participantId: string;
	taskId: string;
	percent: number;
};

export type LeniencyEntry = {
	/** Mean percentage points above (+) or below (−) the other reviewers. */
	meanDeviation: number | null;
	/** Ratings that had at least one other reviewer to compare with. */
	comparisonCount: number;
};

export type ReviewerLeniency = LeniencyEntry & {
	reviewerId: string;
	tasks: Array<LeniencyEntry & { taskId: string }>;
};

/** Unrounded mean, for values that feed into a further mean. */
function rawMean(values: number[]): number | null {
	return values.length === 0
		? null
		: values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = getKey(item);
		const group = groups.get(key);
		if (group) {
			group.push(item);
		} else {
			groups.set(key, [item]);
		}
	}
	return groups;
}

/**
 * How much more generously (+) or strictly (−) each reviewer scores than the
 * others who rated the same participant in the same task. Only shared
 * ratings count, because reviewers see different participants.
 */
export function computeReviewerLeniency(
	percents: ReviewerTaskPercent[],
): ReviewerLeniency[] {
	const deviations: Array<{
		reviewerId: string;
		taskId: string;
		deviation: number;
	}> = [];
	const ratingGroups = groupBy(
		percents,
		(entry) => `${entry.participantId}\u0000${entry.taskId}`,
	);

	for (const group of ratingGroups.values()) {
		for (const entry of group) {
			const others = group.filter((other) => other !== entry);
			const othersMean = rawMean(others.map((other) => other.percent));
			if (othersMean !== null) {
				deviations.push({
					reviewerId: entry.reviewerId,
					taskId: entry.taskId,
					deviation: entry.percent - othersMean,
				});
			}
		}
	}

	const reviewerIds = [...new Set(percents.map((entry) => entry.reviewerId))];
	const byReviewer = groupBy(deviations, (entry) => entry.reviewerId);

	return reviewerIds.map((reviewerId) => {
		const own = byReviewer.get(reviewerId) ?? [];
		const tasks = [...groupBy(own, (entry) => entry.taskId)].map(
			([taskId, entries]) => ({
				taskId,
				meanDeviation: computeMean(entries.map((entry) => entry.deviation)),
				comparisonCount: entries.length,
			}),
		);

		return {
			reviewerId,
			meanDeviation: computeMean(own.map((entry) => entry.deviation)),
			comparisonCount: own.length,
			tasks,
		};
	});
}

export type CriterionStarRating = {
	criteriaId: string;
	participantId: string;
	value: number;
};

export type CriterionDisagreement = {
	criteriaId: string;
	/**
	 * Mean star distance between two reviewers of the same participant; the
	 * mean over all pairs, so more reviewers do not inflate it like a range.
	 */
	meanDistance: number;
	/** Participants rated on this criterion by at least two reviewers. */
	comparisonCount: number;
};

function meanPairDistance(values: number[]): number {
	const distances = values.flatMap((value, index) =>
		values.slice(index + 1).map((other) => Math.abs(value - other)),
	);
	return rawMean(distances) ?? 0;
}

/**
 * How far reviewers' stars lie apart per criterion, averaged over the
 * participants rated by several reviewers, most disputed first. A high
 * distance hints at anchors that read differently to different reviewers.
 */
export function computeCriterionDisagreement(
	ratings: CriterionStarRating[],
): CriterionDisagreement[] {
	const results: CriterionDisagreement[] = [];

	for (const [criteriaId, criterionRatings] of groupBy(
		ratings,
		(rating) => rating.criteriaId,
	)) {
		const distances = [
			...groupBy(criterionRatings, (rating) => rating.participantId).values(),
		]
			.filter((group) => group.length >= 2)
			.map((group) => meanPairDistance(group.map((rating) => rating.value)));
		const meanDistance = computeMean(distances);

		if (meanDistance !== null) {
			results.push({
				criteriaId,
				meanDistance,
				comparisonCount: distances.length,
			});
		}
	}

	return results.sort((left, right) => right.meanDistance - left.meanDistance);
}
