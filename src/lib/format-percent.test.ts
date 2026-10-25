import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatOverallScore,
	formatPercentWithDecimal,
	formatSignedPoints,
} from "./format-percent.ts";

describe("formatPercentWithDecimal", () => {
	it("shows one decimal with a German comma, for scores the exact value ranked", () => {
		assert.equal(formatPercentWithDecimal(59.26), "59,3 %");
		assert.equal(formatPercentWithDecimal(58.6), "58,6 %");
		assert.equal(formatPercentWithDecimal(60), "60,0 %");
	});

	it("shows a dash without a score", () => {
		assert.equal(formatPercentWithDecimal(null), "–");
	});
});

describe("formatOverallScore", () => {
	it("shows whole percent unless the exact value ranked the person", () => {
		assert.equal(formatOverallScore(59.26, false), "59 %");
		assert.equal(formatOverallScore(59.26, true), "59,3 %");
	});
});

describe("formatSignedPoints", () => {
	it("signs percentage points with a true minus and one decimal at most", () => {
		assert.equal(formatSignedPoints(4.89), "+4,9 Pkt.");
		assert.equal(formatSignedPoints(-2.68), "−2,7 Pkt.");
		assert.equal(formatSignedPoints(3), "+3 Pkt.");
		assert.equal(formatSignedPoints(0), "±0 Pkt.");
	});
});
