/**
 * Date as dd.mm.yyyy in German time, so server (UTC) and browser render the
 * same day.
 */
export function formatDate(date: Date): string {
	return date.toLocaleDateString("de-DE", {
		timeZone: "Europe/Berlin",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}
