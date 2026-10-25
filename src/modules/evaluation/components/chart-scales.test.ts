import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getHeatStep, stackDots } from "./chart-scales.ts";

describe("getHeatStep", () => {
	it("steps scores in ten-point bands from 50 up", () => {
		assert.deepEqual(
			[30, 50, 59.4, 60, 70, 80, 100].map(getHeatStep),
			[0, 1, 1, 2, 3, 4, 4],
		);
	});

	it("steps the score shown in the cell, so 59.996 (shown as 60,00 %) is in the 60s", () => {
		assert.equal(getHeatStep(59.996), 2);
		assert.equal(getHeatStep(59.994), 1);
		assert.equal(getHeatStep(59.5), 1);
	});

	it("has no step without a score", () => {
		assert.equal(getHeatStep(null), null);
	});
});

describe("stackDots", () => {
	it("puts dots that would overlap into the next row, keeping input order", () => {
		// 70 and 71 collide; 80 is clear of both
		assert.deepEqual(stackDots([71, 80, 70], 3), [1, 0, 0]);
	});

	it("reuses the lowest free row", () => {
		assert.deepEqual(stackDots([50, 51, 52, 56], 3), [0, 1, 2, 0]);
	});
});
