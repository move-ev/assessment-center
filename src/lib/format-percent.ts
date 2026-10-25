/** Score in whole percent for the app, e.g. "93 %"; a dash without a score. */
export function formatPercent(value: number | null): string {
	return value === null ? "–" : `${Math.round(value)} %`;
}

/**
 * Score with one decimal, e.g. "59,3 %": in the ranking when the exact
 * value decided a tie of the whole percent (Sonderfall 2).
 */
export function formatPercentWithDecimal(value: number | null): string {
	return value === null ? "–" : `${formatDecimal(value)} %`;
}

/** Overall score as the ranking shows it: one decimal only where it ranked. */
export function formatOverallScore(
	value: number | null,
	showsDecimal: boolean,
): string {
	return showsDecimal ? formatPercentWithDecimal(value) : formatPercent(value);
}

/**
 * Spread between reviewers in percentage points with two decimals (the
 * precision it is computed with), so a marked 7.01 never reads as "7,0"; a
 * dash with a single reviewer.
 */
export function formatSpread(spread: number | null): string {
	return spread === null ? "–" : `${spread.toFixed(2).replace(".", ",")} Pkt.`;
}

/**
 * Score in percent with one decimal for the export, e.g. "93,3". Missing
 * scores are "n/a" rather than a dash so spreadsheets don't read a minus.
 */
export function formatPercentForExport(value: number | null): string {
	return value === null ? "n/a" : formatDecimal(value);
}

function formatDecimal(value: number): string {
	return value.toFixed(1).replace(".", ",");
}

/**
 * Signed percentage points with at most one decimal, e.g. "+4,9 Pkt." or
 * "−2,7 Pkt." (true minus sign); "±0 Pkt." for no shift.
 */
export function formatSignedPoints(value: number): string {
	const formatted = Math.abs(value).toLocaleString("de-DE", {
		maximumFractionDigits: 1,
	});
	// Decided on the rounded value, so −0.04 reads "±0", not "−0".
	const sign =
		Math.round(Math.abs(value) * 10) === 0 ? "±" : value > 0 ? "+" : "−";
	return `${sign}${formatted} Pkt.`;
}
