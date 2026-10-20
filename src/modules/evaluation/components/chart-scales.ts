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
