export type RankingBand = "TOP" | "BOTTOM";

/** Share of the ranking marked at each end, in percent. */
export const RANKING_BAND_PERCENT = 15;

/**
 * Marks the top and bottom 15 % of a ranking by position (1-based rank among
 * the ranked participants), not by a fixed score. The band size rounds down,
 * so rankings with fewer than 7 participants get no marking at all.
 */
export function getRankingBand(
	position: number,
	rankedCount: number,
): RankingBand | null {
	const bandSize = Math.floor((rankedCount * RANKING_BAND_PERCENT) / 100);

	if (position <= bandSize) {
		return "TOP";
	}

	if (position > rankedCount - bandSize) {
		return "BOTTOM";
	}

	return null;
}

export type RankInput = {
	name: string;
	overallScore: number | null;
	/** Sonderfall 1 in any task. */
	hasStrongDeviation: boolean;
};

export type RankFields = {
	/** Shared by identical results; null without an overall score. */
	rank: number | null;
	rankingBand: RankingBand | null;
	/** The exact value decided the order, so it is shown with one decimal. */
	showsDecimal: boolean;
};

/**
 * Sonderfall 2: orders by the whole percent shown, then puts people without
 * Sonderfall 1 first, then the exact value decides. People without an
 * overall score come last, by name.
 */
function compareRanked(left: RankInput, right: RankInput): number {
	if (left.overallScore === null || right.overallScore === null) {
		if (left.overallScore !== null) return -1;
		if (right.overallScore !== null) return 1;
		return left.name.localeCompare(right.name, "de-DE");
	}

	return (
		Math.round(right.overallScore) - Math.round(left.overallScore) ||
		Number(left.hasStrongDeviation) - Number(right.hasStrongDeviation) ||
		right.overallScore - left.overallScore
	);
}

/**
 * True when someone else shows the same whole percent with the same
 * Sonderfall-1 status but a different exact value: then the exact value
 * decides between them.
 */
function isDecidedByExactValue(
	participant: RankInput,
	participants: RankInput[],
): boolean {
	const score = participant.overallScore;
	return (
		score !== null &&
		participants.some(
			(other) =>
				other.overallScore !== null &&
				Math.round(other.overallScore) === Math.round(score) &&
				other.hasStrongDeviation === participant.hasStrongDeviation &&
				other.overallScore !== score,
		)
	);
}

/** Sorts and ranks participants; the one place for order, rank and band. */
export function rankParticipants<T extends RankInput>(
	participants: T[],
): Array<T & RankFields> {
	const sorted = [...participants].sort(compareRanked);
	// Position of the first person of each run of identical results.
	const sharedPositions: number[] = [];
	sorted.forEach((participant, index) => {
		const previous = sorted[index - 1];
		sharedPositions[index] =
			previous && compareRanked(previous, participant) === 0
				? (sharedPositions[index - 1] ?? index + 1)
				: index + 1;
	});

	const rankedCount = sorted.filter(
		(participant) => participant.overallScore !== null,
	).length;

	return sorted.map((participant, index) => {
		const rank =
			participant.overallScore === null
				? null
				: (sharedPositions[index] ?? null);
		return {
			...participant,
			rank,
			// A shared rank is its best position, so everyone gets that mark.
			rankingBand: rank === null ? null : getRankingBand(rank, rankedCount),
			showsDecimal: isDecidedByExactValue(participant, sorted),
		};
	});
}
