import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRankingBand } from "./ranking.ts";

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
