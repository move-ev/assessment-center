import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeMeanPercent,
	computeReviewerPercent,
	computeReviewerPercents,
	computeWeightedMean,
	getExpectationPercent,
	starsToPercent,
} from "./scoring.ts";

describe("computeReviewerPercent", () => {
	it("scores one reviewer as weighted points of the reachable maximum, as in the matrix", () => {
		// weights 3 + 3 + 2 + 2 = 10 → 60 reachable points on 1–6
		const criteria = [
			{ id: "a", weight: 3 },
			{ id: "b", weight: 3 },
			{ id: "c", weight: 2 },
			{ id: "d", weight: 2 },
		];
		const ratings = [
			{ criteriaId: "a", value: 6 },
			{ criteriaId: "b", value: 6 },
			{ criteriaId: "c", value: 5 },
			{ criteriaId: "d", value: 5 },
		];

		// 18 + 18 + 10 + 10 = 56 of 60 = 93.33 %
		assert.equal(computeReviewerPercent(criteria, ratings, 6), 93.33);
	});

	it("leaves unrated criteria out of points and maximum", () => {
		const criteria = [
			{ id: "required", weight: 2 },
			{ id: "optional", weight: 1 },
		];

		// only "required" rated: 4 * 2 of 6 * 2 = 66.67 %
		assert.equal(
			computeReviewerPercent(
				criteria,
				[{ criteriaId: "required", value: 4 }],
				6,
			),
			66.67,
		);
		assert.equal(computeReviewerPercent(criteria, [], 6), null);
	});

	it("ignores ratings for criteria that are not scored", () => {
		const criteria = [{ id: "preparation", weight: 1 }];
		const ratings = [
			{ criteriaId: "preparation", value: 3 },
			{ criteriaId: "unweighted", value: 6 },
		];

		// only "preparation" counts: 3 of 6 = 50 %
		assert.equal(computeReviewerPercent(criteria, ratings, 6), 50);
	});

	it("uses the AC's own scale maximum", () => {
		const criteria = [{ id: "a", weight: 1 }];
		const ratings = [{ criteriaId: "a", value: 4 }];

		assert.equal(computeReviewerPercent(criteria, ratings, 5), 80);
		assert.equal(computeReviewerPercent(criteria, ratings, 6), 66.67);
	});
});

describe("computeReviewerPercents", () => {
	it("lists one percentage per reviewer who rated a scored criterion", () => {
		const criteria = [{ id: "a", weight: 1 }];
		const ratingSets = [
			[{ criteriaId: "a", value: 6 }],
			[],
			[{ criteriaId: "a", value: 3 }],
		];

		assert.deepEqual(
			computeReviewerPercents(criteria, ratingSets, 6),
			[100, 50],
		);
	});
});

describe("computeMeanPercent", () => {
	it("averages percentages and has no mean without any", () => {
		assert.equal(computeMeanPercent([50, 75, 100]), 75);
		assert.equal(computeMeanPercent([]), null);
	});
});

describe("task percent (reviewer percents → mean)", () => {
	it("averages the reviewers' percentages, skipping reviewers without ratings", () => {
		const criteria = [
			{ id: "preparation", weight: 2 },
			{ id: "structure", weight: 1 },
		];
		const ratingSets = [
			// (4 * 2 + 2 * 1) of 18 = 55.56 %
			[
				{ criteriaId: "preparation", value: 4 },
				{ criteriaId: "structure", value: 2 },
			],
			// only preparation rated: 5 * 2 of 12 = 83.33 %
			[{ criteriaId: "preparation", value: 5 }],
			[],
		];

		// (55.56 + 83.33) / 2 = 69.44 (the reviewer without ratings is left out)
		assert.equal(
			computeMeanPercent(computeReviewerPercents(criteria, ratingSets, 6)),
			69.44,
		);
		assert.equal(
			computeMeanPercent(computeReviewerPercents(criteria, [[], []], 6)),
			null,
		);
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

	it("weights task scores by task weight, as in the assessment matrix", () => {
		// Selbstpräsentation 0,5 · Gruppencase 1 · Einzelinterview 1,5
		const entries = [
			{ score: 90, weight: 0.5 },
			{ score: 80, weight: 1 },
			{ score: 70, weight: 1.5 },
		];

		// (45 + 80 + 105) / 3 = 76.666… → 76.67
		assert.equal(computeWeightedMean(entries), 76.67);
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

describe("starsToPercent", () => {
	it("puts mean stars on the same percent scale as the scores", () => {
		assert.equal(starsToPercent(4.5, 6), 75);
		assert.equal(starsToPercent(4, 6), 66.67);
	});
});

describe("getExpectationPercent", () => {
	it("is 4 stars (Erwartung erfüllt) of the AC's scale in percent", () => {
		assert.equal(getExpectationPercent(6), 66.67);
		assert.equal(getExpectationPercent(5), 80);
	});
});
