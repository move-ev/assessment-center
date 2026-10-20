/** Score in whole percent for the app, e.g. "93 %"; a dash without a score. */
export function formatPercent(value: number | null): string {
	return value === null ? "–" : `${Math.round(value)} %`;
}

/**
 * Score in percent with one decimal for the export, e.g. "93,3". Missing
 * scores are "n/a" rather than a dash so spreadsheets don't read a minus.
 */
export function formatPercentForExport(value: number | null): string {
	return value === null ? "n/a" : value.toFixed(1).replace(".", ",");
}
