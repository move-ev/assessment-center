import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeCorrelation,
	computeTaskContributions,
	getPositionAmong,
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

describe("computeTaskContributions", () => {
	it("splits the overall score into the weighted share of each task", () => {
		// weights 1 + 3: 80 × 1/4 + 60 × 3/4 = 20 + 45 = overall 65
		assert.deepEqual(
			computeTaskContributions([
				{ taskId: "a", score: 80, weight: 1 },
				{ taskId: "b", score: 60, weight: 3 },
			]),
			[
				{ taskId: "a", contribution: 20 },
				{ taskId: "b", contribution: 45 },
			],
		);
	});

	it("leaves out tasks without a score or weight, like the overall score", () => {
		assert.deepEqual(
			computeTaskContributions([
				{ taskId: "a", score: 90, weight: 2 },
				{ taskId: "b", score: null, weight: 1 },
				{ taskId: "c", score: 50, weight: 0 },
			]),
			[{ taskId: "a", contribution: 90 }],
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
