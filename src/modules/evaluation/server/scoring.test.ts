import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeWeightedCriteriaScore,
	computeWeightedMean,
} from "./scoring.ts";

describe("computeWeightedCriteriaScore", () => {
	it("averages each criterion across reviewers, then weights across criteria", () => {
		const criteria = [
			{ id: "preparation", weight: 2 },
			{ id: "structure", weight: 1 },
		];
		const ratingSets = [
			[
				{ criteriaId: "preparation", value: 4 },
				{ criteriaId: "structure", value: 2 },
			],
			[{ criteriaId: "preparation", value: 5 }],
		];

		// preparation: (4 + 5) / 2 = 4.5, structure: 2
		// (4.5 * 2 + 2 * 1) / 3 = 3.666… → 3.67
		assert.equal(computeWeightedCriteriaScore(criteria, ratingSets), 3.67);
	});

	it("returns null when no criterion has been rated", () => {
		const criteria = [{ id: "preparation", weight: 2 }];

		assert.equal(computeWeightedCriteriaScore(criteria, []), null);
		assert.equal(computeWeightedCriteriaScore(criteria, [[]]), null);
	});

	it("ignores ratings for criteria that are not scored", () => {
		const criteria = [{ id: "preparation", weight: 1 }];
		const ratingSets = [
			[
				{ criteriaId: "preparation", value: 3 },
				{ criteriaId: "unweighted", value: 1 },
			],
		];

		assert.equal(computeWeightedCriteriaScore(criteria, ratingSets), 3);
	});
});

describe("computeWeightedMean", () => {
	it("weights scores and skips missing scores and non-positive weights", () => {
		const entries = [
			{ score: 4, weight: 3 },
			{ score: 2, weight: 1 },
			{ score: null, weight: 5 },
			{ score: 1, weight: 0 },
		];

		// (4 * 3 + 2 * 1) / 4 = 3.5
		assert.equal(computeWeightedMean(entries), 3.5);
	});

	it("returns null when no entry contributes", () => {
		assert.equal(computeWeightedMean([]), null);
		assert.equal(computeWeightedMean([{ score: null, weight: 2 }]), null);
	});

	it("rounds to two decimals", () => {
		const entries = [
			{ score: 1, weight: 1 },
			{ score: 2, weight: 2 },
		];

		// (1 + 4) / 3 = 1.666… → 1.67
		assert.equal(computeWeightedMean(entries), 1.67);
	});
});
