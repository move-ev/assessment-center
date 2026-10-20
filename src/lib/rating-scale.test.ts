import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	assertRatingScaleMax,
	getRatingValues,
	isExtremeRating,
	isRatingScaleMax,
	isValidRating,
} from "./rating-scale.ts";

describe("rating scale", () => {
	it("offers one step per star up to the AC's maximum", () => {
		assert.deepEqual(getRatingValues(5), [1, 2, 3, 4, 5]);
		assert.deepEqual(getRatingValues(6), [1, 2, 3, 4, 5, 6]);
	});

	it("accepts whole stars from 1 to the AC's maximum only", () => {
		assert.equal(isValidRating(6, 6), true);
		assert.equal(isValidRating(1, 5), true);
		assert.equal(isValidRating(6, 5), false);
		assert.equal(isValidRating(0, 6), false);
		assert.equal(isValidRating(7, 6), false);
		assert.equal(isValidRating(2.5, 6), false);
	});

	it("asks for confirmation at 1 and at the AC's maximum", () => {
		assert.equal(isExtremeRating(1, 6), true);
		assert.equal(isExtremeRating(6, 6), true);
		assert.equal(isExtremeRating(5, 6), false);
		assert.equal(isExtremeRating(5, 5), true);
		assert.equal(isExtremeRating(3, 5), false);
	});

	it("knows the 1–5 and 1–6 scales only", () => {
		assert.equal(isRatingScaleMax(5), true);
		assert.equal(isRatingScaleMax(6), true);
		assert.equal(isRatingScaleMax(4), false);
		assert.equal(isRatingScaleMax(10), false);
	});

	it("turns a stored maximum into a known scale or fails loudly", () => {
		assert.equal(assertRatingScaleMax(6), 6);
		assert.throws(() => assertRatingScaleMax(7), /Unbekannte Bewertungsskala/);
	});
});
