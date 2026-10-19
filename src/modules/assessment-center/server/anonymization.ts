/**
 * Maps each id to "<prefix> n" (1-based). With a random source the numbers
 * are shuffled (Fisher-Yates), so a pseudonym reveals nothing about the
 * original order such as the ranking or the order of entry; pass null to
 * keep the input order.
 */
export function assignPseudonyms(
	ids: string[],
	prefix: string,
	random: (() => number) | null = Math.random,
): Map<string, string> {
	const order = [...ids];

	if (random) {
		for (let index = order.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(random() * (index + 1));
			[order[index], order[swapIndex]] = [
				order[swapIndex] as string,
				order[index] as string,
			];
		}
	}

	return new Map(order.map((id, index) => [id, `${prefix} ${index + 1}`]));
}
