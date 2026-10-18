import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getReviewCompletion } from "./review-completion.ts";

describe("getReviewCompletion", () => {
	it("is complete when every required criterion is rated, even with an open optional one", () => {
		const criteria = [
			{ id: "preparation", type: "QUANTITATIVE" as const, isOptional: false },
			{ id: "follow-up", type: "QUANTITATIVE" as const, isOptional: true },
		];

		const completion = getReviewCompletion(criteria, new Set(["preparation"]));

		assert.equal(completion.isComplete, true);
		assert.equal(completion.requiredCount, 1);
		assert.equal(completion.completedRequiredCount, 1);
	});

	it("without required criteria, completes only after the first entry", () => {
		const criteria = [
			{ id: "follow-up", type: "QUANTITATIVE" as const, isOptional: true },
			{ id: "notes", type: "QUALITATIVE" as const, isOptional: false },
		];

		assert.equal(getReviewCompletion(criteria, new Set()).isComplete, false);
		assert.equal(
			getReviewCompletion(criteria, new Set(["notes"])).isComplete,
			true,
		);
	});

	it("reports the sheet status as it is filled in", () => {
		const criteria = [
			{ id: "preparation", type: "QUANTITATIVE" as const, isOptional: false },
			{ id: "structure", type: "QUANTITATIVE" as const, isOptional: false },
			{ id: "notes", type: "QUALITATIVE" as const, isOptional: false },
		];
		const statusFor = (rated: string[]) =>
			getReviewCompletion(criteria, new Set(rated)).status;

		assert.equal(statusFor([]), "NOT_STARTED");
		assert.equal(statusFor(["notes"]), "IN_PROGRESS");
		assert.equal(statusFor(["preparation"]), "IN_PROGRESS");
		assert.equal(statusFor(["preparation", "structure"]), "COMPLETED");
	});

	it("measures progress against required criteria only", () => {
		const criteria = [
			{ id: "preparation", type: "QUANTITATIVE" as const, isOptional: false },
			{ id: "structure", type: "QUANTITATIVE" as const, isOptional: false },
			{ id: "delivery", type: "QUANTITATIVE" as const, isOptional: false },
			{ id: "follow-up", type: "QUANTITATIVE" as const, isOptional: true },
			{ id: "notes", type: "QUALITATIVE" as const, isOptional: false },
		];
		const percentFor = (rated: string[]) =>
			getReviewCompletion(criteria, new Set(rated)).progressPercent;

		assert.equal(percentFor(["follow-up", "notes"]), 0);
		// 1 of 3 required → 33 %
		assert.equal(percentFor(["preparation"]), 33);
		assert.equal(percentFor(["preparation", "structure", "delivery"]), 100);
	});

	it("without required criteria, progress jumps from 0 to 100 on first entry", () => {
		const criteria = [
			{ id: "notes", type: "QUALITATIVE" as const, isOptional: false },
		];

		assert.equal(getReviewCompletion(criteria, new Set()).progressPercent, 0);
		assert.equal(
			getReviewCompletion(criteria, new Set(["notes"])).progressPercent,
			100,
		);
	});

	it("reports a task without criteria as such, never as complete", () => {
		const completion = getReviewCompletion([], new Set());

		assert.equal(completion.status, "NO_CRITERIA");
		assert.equal(completion.isComplete, false);
	});
});
