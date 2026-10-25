import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRankingBand, rankParticipants } from "./ranking.ts";

describe("getRankingBand", () => {
	it("marks the top and bottom 15 % of a ranking by position", () => {
		// 10 ranked × 15 % = 1.5 → 1 per end
		assert.equal(getRankingBand(1, 10), "TOP");
		assert.equal(getRankingBand(2, 10), null);
		assert.equal(getRankingBand(9, 10), null);
		assert.equal(getRankingBand(10, 10), "BOTTOM");
	});

	it("marks nobody below 7 ranked participants", () => {
		for (let position = 1; position <= 6; position += 1) {
			assert.equal(getRankingBand(position, 6), null);
		}

		// 7 × 15 % = 1.05 → 1 per end
		assert.equal(getRankingBand(1, 7), "TOP");
		assert.equal(getRankingBand(7, 7), "BOTTOM");
	});

	it("rounds the band size down in larger rankings", () => {
		// 20 × 15 % = 3 per end; 33 × 15 % = 4.95 → 4 per end
		assert.equal(getRankingBand(3, 20), "TOP");
		assert.equal(getRankingBand(4, 20), null);
		assert.equal(getRankingBand(18, 20), "BOTTOM");
		assert.equal(getRankingBand(4, 33), "TOP");
		assert.equal(getRankingBand(5, 33), null);
		assert.equal(getRankingBand(29, 33), null);
		assert.equal(getRankingBand(30, 33), "BOTTOM");
	});
});

function person(
	name: string,
	overallScore: number | null,
	hasStrongDeviation = false,
) {
	return { name, overallScore, hasStrongDeviation };
}

describe("rankParticipants", () => {
	it("orders by the score shown, even when a lower one has no strong reviewer deviation", () => {
		// The case from the AC: 69,46 % and 68,60 % with Sonderfall 1 rank
		// above 68,50 % without.
		const ranked = rankParticipants([
			person("Ohne", 68.5),
			person("Abweichung hoch", 69.46, true),
			person("Abweichung", 68.6, true),
		]);

		assert.deepEqual(
			ranked.map((entry) => [entry.name, entry.rank]),
			[
				["Abweichung hoch", 1],
				["Abweichung", 2],
				["Ohne", 3],
			],
		);
	});

	it("puts the person without a strong reviewer deviation first when the score shown ties", () => {
		const ranked = rankParticipants([
			person("Abweichung", 59.414, true),
			person("Ohne", 59.406),
			person("Vorn", 80),
		]);

		assert.deepEqual(
			ranked.map((entry) => [entry.name, entry.rank]),
			[
				["Vorn", 1],
				["Ohne", 2],
				["Abweichung", 3],
			],
		);
	});

	it("gives identical results the same rank and skips the places they share", () => {
		const ranked = rankParticipants([
			person("Erste", 80),
			person("Gleich A", 62.5),
			person("Gleich B", 62.5),
			person("Danach", 50),
		]);

		assert.deepEqual(
			ranked.map((entry) => [entry.name, entry.rank]),
			[
				["Erste", 1],
				["Gleich A", 2],
				["Gleich B", 2],
				["Danach", 4],
			],
		);
	});

	it("shares a rank when only digits beyond the two shown differ", () => {
		const ranked = rankParticipants([
			person("Knapp drunter", 62.496),
			person("Knapp drüber", 62.504),
		]);

		assert.deepEqual(
			ranked.map((entry) => entry.rank),
			[1, 1],
		);
	});

	it("does not share a rank when only Sonderfall 1 differs", () => {
		const ranked = rankParticipants([
			person("Abweichung", 62.5, true),
			person("Ohne", 62.5),
		]);

		assert.deepEqual(
			ranked.map((entry) => [entry.name, entry.rank]),
			[
				["Ohne", 1],
				["Abweichung", 2],
			],
		);
	});

	it("gives everyone sharing a rank the 15 % mark of the better position", () => {
		// 8 ranked × 15 % = 1.2 → 1 per end
		const ranked = rankParticipants([
			person("Top A", 90),
			person("Top B", 90),
			person("C", 70),
			person("D", 65),
			person("E", 60),
			person("F", 55),
			person("Unten A", 30),
			person("Unten B", 30),
		]);

		assert.deepEqual(
			ranked.map((entry) => [entry.name, entry.rank, entry.rankingBand]),
			[
				["Top A", 1, "TOP"],
				["Top B", 1, "TOP"],
				["C", 3, null],
				["D", 4, null],
				["E", 5, null],
				["F", 6, null],
				// shared rank 7 is not in the bottom band, so neither is marked
				["Unten A", 7, null],
				["Unten B", 7, null],
			],
		);
	});

	it("lists people without an overall score last, by name, without rank or mark", () => {
		const ranked = rankParticipants([
			person("Zora", null),
			person("Anna", null),
			person("Mit Wert", 40),
		]);

		assert.deepEqual(
			ranked.map((entry) => [entry.name, entry.rank, entry.rankingBand]),
			[
				["Mit Wert", 1, null],
				["Anna", null, null],
				["Zora", null, null],
			],
		);
	});

	it("keeps the bottom mark for a shared rank inside the bottom band", () => {
		// 14 ranked × 15 % = 2.1 → 2 per end; the last two share rank 13
		const scores = [95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 20, 20];
		const ranked = rankParticipants(
			scores.map((score, index) => person(`P${index + 1}`, score)),
		);

		assert.deepEqual(
			ranked.slice(-3).map((entry) => [entry.rank, entry.rankingBand]),
			[
				[12, null],
				[13, "BOTTOM"],
				[13, "BOTTOM"],
			],
		);
	});
});
