import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeHypotheticalOverallScores,
	estimateReviewerEffects,
} from "./hypothetical-scores.ts";

function approx(actual: number | null | undefined, expected: number) {
	assert.ok(
		actual !== null &&
			actual !== undefined &&
			Math.abs(actual - expected) < 0.01,
		`expected ${expected}, got ${actual}`,
	);
}

describe("estimateReviewerEffects", () => {
	it("splits shared ratings into a person's score and a shift per reviewer, centred on the average reviewer", () => {
		// r1 always 10 points above r2, over many people: shrinkage barely matters.
		const percents = Array.from({ length: 40 }, (_, index) => [
			{
				reviewerId: "r1",
				participantId: `p${index}`,
				taskId: "t",
				percent: 60 + (index % 5) + 10,
			},
			{
				reviewerId: "r2",
				participantId: `p${index}`,
				taskId: "t",
				percent: 60 + (index % 5),
			},
		]).flat();

		const { reviewers, taskScores } = estimateReviewerEffects(percents);

		const effect = (id: string) =>
			reviewers.find((reviewer) => reviewer.reviewerId === id)?.effect;
		// 10 points apart, shrunk by 40 / (40 + 3)
		approx(effect("r1"), (5 * 40) / 43);
		approx(effect("r2"), (-5 * 40) / 43);
		approx(taskScores.find((entry) => entry.participantId === "p0")?.score, 65);
	});

	it("corrects a person rated only by a strict reviewer by what the reviewer showed elsewhere", () => {
		const percents = [
			...["a", "b", "c", "d", "e", "f"].flatMap((participantId) => [
				{ reviewerId: "strict", participantId, taskId: "t", percent: 50 },
				{ reviewerId: "mild", participantId, taskId: "t", percent: 70 },
			]),
			{
				reviewerId: "strict",
				participantId: "alone",
				taskId: "t",
				percent: 50,
			},
		];

		const { reviewers, taskScores } = estimateReviewerEffects(percents);
		const strict = reviewers.find(
			(reviewer) => reviewer.reviewerId === "strict",
		);

		// ±10 shrunk by 6 / (6 + 3)
		approx(strict?.effect ?? null, -6.67);
		assert.equal(strict?.comparisonCount, 6);
		approx(
			taskScores.find((entry) => entry.participantId === "alone")?.score,
			56.67,
		);
	});

	it("has no effect for a reviewer who never shared a rating", () => {
		const { reviewers, taskScores } = estimateReviewerEffects([
			{ reviewerId: "r1", participantId: "p", taskId: "t", percent: 80 },
		]);

		assert.deepEqual(reviewers, [
			{ reviewerId: "r1", effect: null, comparisonCount: 0 },
		]);
		assert.deepEqual(taskScores, [
			{ participantId: "p", taskId: "t", score: 80 },
		]);
	});
});

describe("computeHypotheticalOverallScores", () => {
	it("shifts every task by the reviewer's effect and weights the tasks like the real score", () => {
		const scores = computeHypotheticalOverallScores(
			[
				{ participantId: "p", taskId: "sp", score: 60 },
				{ participantId: "p", taskId: "gc", score: 80 },
			],
			new Map([
				["sp", 0.5],
				["gc", 1],
			]),
			-5,
		);

		// (55 × 0.5 + 75 × 1) / 1.5
		assert.equal(scores.get("p"), 68.33);
	});

	it("keeps shifted task scores within 0–100 %", () => {
		const scores = computeHypotheticalOverallScores(
			[{ participantId: "p", taskId: "t", score: 96 }],
			new Map([["t", 1]]),
			8,
		);

		assert.equal(scores.get("p"), 100);
	});
});
