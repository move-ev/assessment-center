import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	compareParticipants,
	parseComparisonIds,
} from "./participant-comparison.ts";

const tasks = [{ id: "sp" }, { id: "gc" }, { id: "ei" }];

describe("compareParticipants", () => {
	it("names the best person per task", () => {
		const { tasks: result } = compareParticipants(
			[
				{ id: "a", overallScore: 70, taskScores: { sp: 80, gc: 50, ei: 70 } },
				{ id: "b", overallScore: 60, taskScores: { sp: 60, gc: 75, ei: 50 } },
			],
			tasks,
		);

		assert.deepEqual(result, [
			{ id: "sp", leaderIds: ["a"] },
			{ id: "gc", leaderIds: ["b"] },
			{ id: "ei", leaderIds: ["a"] },
		]);
	});

	it("names everyone on a tie and nobody where fewer than two people have a score", () => {
		const { tasks: result } = compareParticipants(
			[
				{ id: "a", overallScore: 70, taskScores: { sp: 80, gc: null } },
				{ id: "b", overallScore: 60, taskScores: { sp: 80, gc: 75 } },
				{ id: "c", overallScore: null, taskScores: {} },
			],
			tasks,
		);

		assert.deepEqual(result, [
			{ id: "sp", leaderIds: ["a", "b"] },
			{ id: "gc", leaderIds: [] },
			{ id: "ei", leaderIds: [] },
		]);
	});

	it("counts the tasks each person leads and their gap to the best overall score", () => {
		const { people } = compareParticipants(
			[
				{ id: "a", overallScore: 70.5, taskScores: { sp: 80, gc: 50, ei: 70 } },
				{
					id: "b",
					overallScore: 62.25,
					taskScores: { sp: 80, gc: 75, ei: 50 },
				},
				{ id: "c", overallScore: null, taskScores: {} },
			],
			tasks,
		);

		// sp is a tie: it counts for both
		assert.deepEqual(
			people.map(({ id, leadCount, gapToBest }) => ({
				id,
				leadCount,
				gapToBest,
			})),
			[
				{ id: "a", leadCount: 2, gapToBest: 0 },
				{ id: "b", leadCount: 2, gapToBest: 8.25 },
				{ id: "c", leadCount: 0, gapToBest: null },
			],
		);
	});
});

describe("parseComparisonIds", () => {
	const known = ["p1", "p2", "p3", "p4"];

	it("reads 2–3 comma-separated participants, dropping repeats", () => {
		assert.deepEqual(parseComparisonIds("p2,p1", known), {
			ok: true,
			ids: ["p2", "p1"],
		});
		assert.deepEqual(parseComparisonIds("p1,p2,p1,p3", known), {
			ok: true,
			ids: ["p1", "p2", "p3"],
		});
	});

	it("refuses fewer than 2, more than 3 or unknown participants", () => {
		assert.deepEqual(parseComparisonIds("p1", known), {
			ok: false,
			reason: "TOO_FEW",
		});
		assert.deepEqual(parseComparisonIds(undefined, known), {
			ok: false,
			reason: "TOO_FEW",
		});
		assert.deepEqual(parseComparisonIds("p1,p2,p3,p4", known), {
			ok: false,
			reason: "TOO_MANY",
		});
		assert.deepEqual(parseComparisonIds("p1,x9", known), {
			ok: false,
			reason: "UNKNOWN",
		});
	});

	it("accepts the ids repeated in the URL, as Next.js passes them as a list", () => {
		assert.deepEqual(parseComparisonIds(["p1", "p2,p3"], known), {
			ok: true,
			ids: ["p1", "p2", "p3"],
		});
	});
});
