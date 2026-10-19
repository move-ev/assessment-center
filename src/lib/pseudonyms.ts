/** Maps each id to "<prefix> n" (1-based) in the given order. */
export function numberInOrder(
	ids: string[],
	prefix: string,
): Map<string, string> {
	return new Map(ids.map((id, index) => [id, `${prefix} ${index + 1}`]));
}

/**
 * Like numberInOrder, but shuffles first (Fisher-Yates), so a pseudonym
 * reveals nothing about the original order such as the ranking or the order
 * of entry.
 */
export function assignPseudonyms(
	ids: string[],
	prefix: string,
	random: () => number = Math.random,
): Map<string, string> {
	const order = [...ids];

	for (let index = order.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1));
		const current = order[index];
		const other = order[swapIndex];

		// Unreachable: both indexes are within the array.
		if (current === undefined || other === undefined) {
			continue;
		}

		order[index] = other;
		order[swapIndex] = current;
	}

	return numberInOrder(order, prefix);
}
