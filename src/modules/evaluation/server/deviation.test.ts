import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeReviewerSpread, isStrongDeviation } from "./deviation.ts";

describe("reviewer deviation", () => {
	it("measures the spread between the highest and lowest reviewer", () => {
		// Gruppencase example from the assessment matrix
		assert.equal(computeReviewerSpread([95, 97, 94, 89]), 8);
	});

	it("has no spread with fewer than two reviewers", () => {
		assert.equal(computeReviewerSpread([91]), null);
		assert.equal(computeReviewerSpread([]), null);
	});

	it("marks a spread of more than 7 percentage points only", () => {
		assert.equal(isStrongDeviation(8), true);
		assert.equal(isStrongDeviation(7.01), true);
		assert.equal(isStrongDeviation(7), false);
		assert.equal(isStrongDeviation(null), false);
		// 94.33 − 87.33 is 7.000…014 in floating point: still exactly 7
		assert.equal(
			isStrongDeviation(computeReviewerSpread([94.33, 87.33])),
			false,
		);
	});
});
