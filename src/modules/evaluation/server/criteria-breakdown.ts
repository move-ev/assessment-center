import { computeMean } from "./scoring.ts";

/** Reviewers this many stars apart on one criterion are worth a look. */
export const STAR_SPREAD_HIGHLIGHT = 2;

export type BreakdownAssignment = {
	reviewerId: string;
	reviewerName: string;
	quantitativeRatings: Array<{ criteriaId: string; value: number }>;
	qualitativeRatings: Array<{ criteriaId: string; text: string }>;
};

export type CriterionRow = {
	criteriaId: string;
	/** Stars per reviewer in the order of the assignments; quantitative only. */
	values: Array<{ reviewerId: string; value: number | null }>;
	/** Mean stars of the reviewers who rated; null without any. */
	mean: number | null;
	/** Highest minus lowest stars; null with fewer than two ratings. */
	spread: number | null;
	/** Written feedback with its author; qualitative only, blanks left out. */
	texts: Array<{ reviewerId: string; reviewerName: string; text: string }>;
};

type CriterionInput = { id: string; type: "QUANTITATIVE" | "QUALITATIVE" };

/**
 * One row per criterion of a task for one participant: what each reviewer
 * gave, so a spread between reviewers can be traced to its criteria. Each
 * row carries the criterion it was built from.
 */
export function buildCriterionRows<C extends CriterionInput>(
	criteria: C[],
	assignments: BreakdownAssignment[],
): Array<CriterionRow & { criterion: C }> {
	return criteria.map((criterion) => {
		if (criterion.type === "QUALITATIVE") {
			return {
				criterion,
				criteriaId: criterion.id,
				values: [],
				mean: null,
				spread: null,
				texts: assignments.flatMap((assignment) =>
					assignment.qualitativeRatings
						.filter((rating) => rating.criteriaId === criterion.id)
						.map((rating) => rating.text.trim())
						.filter((text) => text !== "")
						.map((text) => ({
							reviewerId: assignment.reviewerId,
							reviewerName: assignment.reviewerName,
							text,
						})),
				),
			};
		}

		const values = assignments.map((assignment) => ({
			reviewerId: assignment.reviewerId,
			value:
				assignment.quantitativeRatings.find(
					(rating) => rating.criteriaId === criterion.id,
				)?.value ?? null,
		}));
		const rated = values.flatMap((entry) =>
			entry.value === null ? [] : [entry.value],
		);

		return {
			criterion,
			criteriaId: criterion.id,
			values,
			mean: computeMean(rated),
			spread: rated.length < 2 ? null : Math.max(...rated) - Math.min(...rated),
			texts: [],
		};
	});
}
