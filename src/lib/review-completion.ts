export type CompletionCriterion = {
	id: string;
	type: "QUANTITATIVE" | "QUALITATIVE";
	isOptional: boolean;
};

export type ReviewCompletionStatus =
	| "NO_CRITERIA"
	| "NOT_STARTED"
	| "IN_PROGRESS"
	| "COMPLETED";

export type ReviewCompletion = {
	requiredCount: number;
	completedRequiredCount: number;
	isComplete: boolean;
	/** Share of required criteria rated, 0–100. Without required criteria: 0 or 100. */
	progressPercent: number;
	status: ReviewCompletionStatus;
};

export type RatedAssignment = {
	quantitativeRatings: Array<{ criteriaId: string }>;
	qualitativeRatings: Array<{ criteriaId: string }>;
};

/** Required means quantitative and not marked optional. */
function isRequiredCriterion(criterion: CompletionCriterion): boolean {
	return criterion.type === "QUANTITATIVE" && !criterion.isOptional;
}

export function getRatedCriteriaIds(assignment: RatedAssignment): Set<string> {
	return new Set([
		...assignment.quantitativeRatings.map((rating) => rating.criteriaId),
		...assignment.qualitativeRatings.map((rating) => rating.criteriaId),
	]);
}

/**
 * A rating sheet is complete once every required criterion is rated.
 * Required means quantitative and not marked optional; free-text criteria
 * never count. A sheet without required criteria completes after its first
 * entry, so an untouched sheet never reads as done.
 */
export function getReviewCompletion(
	criteria: CompletionCriterion[],
	ratedCriteriaIds: ReadonlySet<string>,
): ReviewCompletion {
	const required = criteria.filter(isRequiredCriterion);
	const completedRequiredCount = required.filter((criterion) =>
		ratedCriteriaIds.has(criterion.id),
	).length;

	const hasAnyEntry = criteria.some((criterion) =>
		ratedCriteriaIds.has(criterion.id),
	);

	const isComplete =
		required.length > 0
			? completedRequiredCount === required.length
			: hasAnyEntry;

	return {
		requiredCount: required.length,
		completedRequiredCount,
		isComplete,
		progressPercent: getProgressPercent(
			required.length,
			completedRequiredCount,
			isComplete,
		),
		status: getStatus(criteria.length, isComplete, hasAnyEntry),
	};
}

/**
 * Required criteria still unrated, in the given order. These are what keeps
 * a sheet open; a sheet without required criteria has none and stays open
 * only until its first entry.
 */
export function getMissingRequiredCriteria<T extends CompletionCriterion>(
	criteria: T[],
	ratedCriteriaIds: ReadonlySet<string>,
): T[] {
	return criteria.filter(
		(criterion) =>
			isRequiredCriterion(criterion) && !ratedCriteriaIds.has(criterion.id),
	);
}

export function getAssignmentCompletion(
	criteria: CompletionCriterion[],
	assignment: RatedAssignment,
): ReviewCompletion {
	return getReviewCompletion(criteria, getRatedCriteriaIds(assignment));
}

function getProgressPercent(
	requiredCount: number,
	completedRequiredCount: number,
	isComplete: boolean,
): number {
	if (requiredCount === 0) {
		return isComplete ? 100 : 0;
	}

	return Math.round((completedRequiredCount / requiredCount) * 100);
}

function getStatus(
	criteriaCount: number,
	isComplete: boolean,
	hasAnyEntry: boolean,
): ReviewCompletionStatus {
	if (criteriaCount === 0) {
		return "NO_CRITERIA";
	}

	if (isComplete) {
		return "COMPLETED";
	}

	return hasAnyEntry ? "IN_PROGRESS" : "NOT_STARTED";
}
