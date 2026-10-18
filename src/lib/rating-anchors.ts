/** Maximum length of an anchor text under the rating scale. */
export const RATING_ANCHOR_MAX_LENGTH = 1000;

/** What 2 and 4 stars stand for, as defined in the assessment matrix. */
export const RATING_ANCHOR_LABELS = {
	2: "Erwartung kaum erfüllt",
	4: "Erwartung erfüllt",
} as const;
