import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatPercent,
	formatPercentForExport,
	formatSignedPoints,
	toShownPercent,
} from "./format-percent.ts";

describe("formatPercent", () => {
	it("shows two decimals with a German comma", () => {
		assert.equal(formatPercent(92.414), "92,41 %");
		assert.equal(formatPercent(69.456), "69,46 %");
		assert.equal(formatPercent(60), "60,00 %");
	});

	it("shows a dash without a score", () => {
		assert.equal(formatPercent(null), "–");
	});
});

describe("toShownPercent", () => {
	it("is the value formatPercent shows, so ranking and display agree", () => {
		assert.equal(toShownPercent(92.414), 92.41);
		assert.equal(toShownPercent(92.406), 92.41);
		assert.equal(toShownPercent(68.5), 68.5);
	});
});

describe("formatPercentForExport", () => {
	it("shows two decimals, and n/a without a score", () => {
		assert.equal(formatPercentForExport(93.333), "93,33");
		assert.equal(formatPercentForExport(null), "n/a");
	});
});

describe("formatSignedPoints", () => {
	it("signs percentage points with a true minus and one decimal at most", () => {
		assert.equal(formatSignedPoints(4.89), "+4,9 Pkt.");
		assert.equal(formatSignedPoints(-2.68), "−2,7 Pkt.");
		assert.equal(formatSignedPoints(3), "+3 Pkt.");
		assert.equal(formatSignedPoints(0), "±0 Pkt.");
		assert.equal(formatSignedPoints(-0.04), "±0 Pkt.");
		assert.equal(formatSignedPoints(0.04), "±0 Pkt.");
	});
});
