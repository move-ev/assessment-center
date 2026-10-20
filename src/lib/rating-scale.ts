/** Rating scales an AC can use: 1–5 (older ACs) or 1–6 (assessment matrix). */
export const RATING_SCALE_MAXIMUMS = [5, 6] as const;

export type RatingScaleMax = (typeof RATING_SCALE_MAXIMUMS)[number];

/** Narrows a stored maximum (an Int column) to a known scale. */
export function isRatingScaleMax(value: number): value is RatingScaleMax {
	return RATING_SCALE_MAXIMUMS.some((max) => max === value);
}

/** The selectable star values, 1 up to the AC's maximum. */
export function getRatingValues(max: RatingScaleMax): number[] {
	return Array.from({ length: max }, (_, index) => index + 1);
}

/** Whole stars from 1 up to the AC's maximum. */
export function isValidRating(value: number, max: RatingScaleMax): boolean {
	return Number.isInteger(value) && value >= 1 && value <= max;
}

/** Lowest and highest star need a confirmation before they are saved. */
export function isExtremeRating(value: number, max: RatingScaleMax): boolean {
	return value === 1 || value === max;
}

/**
 * Narrows a stored maximum to a known scale. The check constraint only
 * allows known scales, so anything else is corrupt data and fails loudly.
 */
export function assertRatingScaleMax(value: number): RatingScaleMax {
	if (!isRatingScaleMax(value)) {
		throw new Error(`Unbekannte Bewertungsskala: 1–${value}`);
	}

	return value;
}
