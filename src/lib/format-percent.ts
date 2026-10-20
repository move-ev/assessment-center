/** Score in whole percent for the app, e.g. "93 %"; a dash without a score. */
export function formatPercent(value: number | null): string {
	return value === null ? "–" : `${Math.round(value)} %`;
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
