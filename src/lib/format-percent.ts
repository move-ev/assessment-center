/**
 * Score as the app shows it, rounded to two decimals: what one reads is
 * what ranks, so 92.414 and 92.406 both count as 92.41.
 */
export function toShownPercent(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Score in percent with two decimals, e.g. "92,41 %"; a dash without a score. */
export function formatPercent(value: number | null): string {
	return value === null ? "–" : `${formatDecimal(value)} %`;
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
 * Score in percent with two decimals for the export, e.g. "93,33". Missing
 * scores are "n/a" rather than a dash so spreadsheets don't read a minus.
 */
export function formatPercentForExport(value: number | null): string {
	return value === null ? "n/a" : formatDecimal(value);
}

function formatDecimal(value: number): string {
	return toShownPercent(value).toFixed(2).replace(".", ",");
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
