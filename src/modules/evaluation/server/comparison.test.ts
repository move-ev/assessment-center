import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	compareToMean,
	computeCorrelation,
	getPositionAmong,
	pickStrengthsAndWeaknesses,
	summarizeScores,
} from "./comparison.ts";

describe("summarizeScores", () => {
	it("summarizes the scores of an AC as lowest, highest and mean", () => {
		assert.deepEqual(summarizeScores([60, 90, 70]), {
			count: 3,
			min: 60,
			max: 90,
			mean: 73.33,
		});
	});

	it("has no summary without scores", () => {
		assert.equal(summarizeScores([]), null);
	});
});

describe("getPositionAmong", () => {
	it("places a score by how many others scored higher", () => {
		assert.deepEqual(getPositionAmong(70, [90, 70, 60, 80]), {
			position: 3,
			count: 4,
		});
	});

	it("gives tied scores the same position", () => {
		assert.deepEqual(getPositionAmong(80, [80, 90, 80]), {
			position: 2,
			count: 3,
		});
	});
});

describe("compareToMean", () => {
	it("calls a score more than 3 points off the mean above or below, more than 10 strongly", () => {
		assert.deepEqual(
			[60, 63, 57, 64, 56, 70.01, 49.99].map(
				(score) => compareToMean(score, 60)?.tone,
			),
			[
				"AVERAGE",
				"AVERAGE",
				"AVERAGE",
				"ABOVE",
				"BELOW",
				"STRONG_ABOVE",
				"STRONG_BELOW",
			],
		);
	});

	it("gives the distance from the mean in points", () => {
		assert.deepEqual(compareToMean(72.5, 60.25), {
			delta: 12.25,
			tone: "STRONG_ABOVE",
		});
	});

	it("has no comparison without a score or a mean", () => {
		assert.equal(compareToMean(null, 60), null);
		assert.equal(compareToMean(70, null), null);
	});
});

describe("pickStrengthsAndWeaknesses", () => {
	const items = [
		{ id: "a", delta: 12 },
		{ id: "b", delta: -2 },
		{ id: "c", delta: 5 },
		{ id: "d", delta: -15 },
		{ id: "e", delta: 20 },
		{ id: "f", delta: -4 },
	];

	it("lists the clearest strengths and weaknesses first, leaving out the average", () => {
		const { strengths, weaknesses } = pickStrengthsAndWeaknesses(items, 2);
		assert.deepEqual(
			strengths.map((item) => item.id),
			["e", "a"],
		);
		assert.deepEqual(
			weaknesses.map((item) => item.id),
			["d", "f"],
		);
	});
});

describe("computeCorrelation", () => {
	it("measures how closely two tasks' scores go together", () => {
		assert.equal(
			computeCorrelation([
				{ x: 50, y: 60 },
				{ x: 70, y: 80 },
				{ x: 90, y: 100 },
			]),
			1,
		);
		assert.equal(
			computeCorrelation([
				{ x: 50, y: 90 },
				{ x: 70, y: 70 },
				{ x: 90, y: 50 },
			]),
			-1,
		);
	});

	it("has no correlation with fewer than three people or without variation", () => {
		assert.equal(
			computeCorrelation([
				{ x: 50, y: 60 },
				{ x: 70, y: 80 },
			]),
			null,
		);
		assert.equal(
			computeCorrelation([
				{ x: 60, y: 60 },
				{ x: 60, y: 80 },
				{ x: 60, y: 70 },
			]),
			null,
		);
	});
});
