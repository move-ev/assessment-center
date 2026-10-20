import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeCriterionDisagreement,
	computeReviewerLeniency,
} from "./calibration.ts";

describe("computeReviewerLeniency", () => {
	it("compares each reviewer with the others who rated the same person in the same task", () => {
		const leniency = computeReviewerLeniency([
			{ reviewerId: "r1", participantId: "p1", taskId: "t", percent: 80 },
			{ reviewerId: "r2", participantId: "p1", taskId: "t", percent: 60 },
			{ reviewerId: "r1", participantId: "p2", taskId: "t", percent: 70 },
			{ reviewerId: "r2", participantId: "p2", taskId: "t", percent: 66 },
		]);

		// r1: +20 and +4 → +12; r2: −20 and −4 → −12
		assert.deepEqual(leniency, [
			{
				reviewerId: "r1",
				meanDeviation: 12,
				comparisonCount: 2,
				tasks: [{ taskId: "t", meanDeviation: 12, comparisonCount: 2 }],
			},
			{
				reviewerId: "r2",
				meanDeviation: -12,
				comparisonCount: 2,
				tasks: [{ taskId: "t", meanDeviation: -12, comparisonCount: 2 }],
			},
		]);
	});

	it("measures against the mean of all other reviewers", () => {
		const [first] = computeReviewerLeniency([
			{ reviewerId: "r1", participantId: "p", taskId: "t", percent: 90 },
			{ reviewerId: "r2", participantId: "p", taskId: "t", percent: 70 },
			{ reviewerId: "r3", participantId: "p", taskId: "t", percent: 80 },
		]);

		// others: (70 + 80) / 2 = 75
		assert.equal(first?.meanDeviation, 15);
	});

	it("has nothing to compare for a reviewer who rated alone", () => {
		assert.deepEqual(
			computeReviewerLeniency([
				{ reviewerId: "r1", participantId: "p", taskId: "t", percent: 90 },
			]),
			[
				{
					reviewerId: "r1",
					meanDeviation: null,
					comparisonCount: 0,
					tasks: [],
				},
			],
		);
	});
});

describe("computeCriterionDisagreement", () => {
	it("averages the star distance per criterion over people rated by several reviewers, most disputed first", () => {
		assert.deepEqual(
			computeCriterionDisagreement([
				{ criteriaId: "calm", participantId: "p1", value: 4 },
				{ criteriaId: "calm", participantId: "p1", value: 5 },
				{ criteriaId: "structure", participantId: "p1", value: 2 },
				{ criteriaId: "structure", participantId: "p1", value: 5 },
				{ criteriaId: "structure", participantId: "p2", value: 3 },
				{ criteriaId: "structure", participantId: "p2", value: 4 },
				{ criteriaId: "structure", participantId: "p3", value: 6 },
			]),
			[
				{ criteriaId: "structure", meanDistance: 2, comparisonCount: 2 },
				{ criteriaId: "calm", meanDistance: 1, comparisonCount: 1 },
			],
		);
	});

	it("uses the mean distance between pairs, so a third reviewer does not inflate it", () => {
		// pairs 4–5, 4–6, 5–6: (1 + 2 + 1) / 3 = 1.33, not the range 2
		assert.deepEqual(
			computeCriterionDisagreement([
				{ criteriaId: "c", participantId: "p", value: 4 },
				{ criteriaId: "c", participantId: "p", value: 5 },
				{ criteriaId: "c", participantId: "p", value: 6 },
			]),
			[{ criteriaId: "c", meanDistance: 1.33, comparisonCount: 1 }],
		);
	});
});
