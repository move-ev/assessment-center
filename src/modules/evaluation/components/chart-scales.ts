import { toShownPercent } from "../../../lib/format-percent.ts";

/** Lower bounds of the heat steps 1–4; step 0 lies below the first. */
export const HEAT_STEP_BOUNDS = [50, 60, 70, 80] as const;

export type HeatStep = 0 | 1 | 2 | 3 | 4;

/**
 * Colour step of a score in the heat map. Fixed bands rather than the AC's
 * own range, so the same colour means the same score in every AC. Steps the
 * score the cell shows (formatPercent), so 59.996, shown as "60,00 %", is in
 * the 60s.
 */
export function getHeatStep(score: number | null): HeatStep | null {
	if (score === null) {
		return null;
	}

	const shown = toShownPercent(score);
	return HEAT_STEP_BOUNDS.filter((bound) => shown >= bound).length as HeatStep;
}

/**
 * Row per dot on a strip so dots closer than `minGap` (in axis units) stack
 * instead of hiding each other. Rows come back in input order.
 */
export function stackDots(values: number[], minGap: number): number[] {
	const rowEnds: number[] = [];
	const rows = new Array<number>(values.length);
	const order = values
		.map((value, index) => ({ value, index }))
		.sort((left, right) => left.value - right.value);

	for (const { value, index } of order) {
		let row = rowEnds.findIndex((end) => value - end >= minGap);
		if (row === -1) {
			row = rowEnds.length;
		}
		rowEnds[row] = value;
		rows[index] = row;
	}

	return rows;
}
