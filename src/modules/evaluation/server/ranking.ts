export type RankingBand = "TOP" | "BOTTOM";

const BAND_SHARE = 0.15;

/**
 * Marks the top and bottom 15 % of a ranking by position (1-based rank among
 * the ranked participants), not by a fixed score. The band size rounds down,
 * so rankings with fewer than 7 participants get no marking at all.
 */
export function getRankingBand(
	position: number,
	rankedCount: number,
): RankingBand | null {
	const bandSize = Math.floor(rankedCount * BAND_SHARE);

	if (position <= bandSize) {
		return "TOP";
	}

	if (position > rankedCount - bandSize) {
		return "BOTTOM";
	}

	return null;
}
