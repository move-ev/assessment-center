/** Score with two decimals, or a dash when there is none. */
export function formatScore(value: number | null): string {
	return value === null ? "–" : value.toFixed(2);
}
