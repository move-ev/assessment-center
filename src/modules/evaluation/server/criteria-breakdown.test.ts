import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCriterionRows } from "./criteria-breakdown.ts";

const criteria = [
	{ id: "c1", type: "QUANTITATIVE" as const },
	{ id: "c2", type: "QUANTITATIVE" as const },
	{ id: "q", type: "QUALITATIVE" as const },
];

describe("buildCriterionRows", () => {
	it("lists each reviewer's stars per criterion and the mean of those who rated", () => {
		const rows = buildCriterionRows(criteria, [
			{
				reviewerId: "r1",
				reviewerName: "Anna",
				quantitativeRatings: [
					{ criteriaId: "c1", value: 2 },
					{ criteriaId: "c2", value: 4 },
				],
				qualitativeRatings: [],
			},
			{
				reviewerId: "r2",
				reviewerName: "Ben",
				quantitativeRatings: [{ criteriaId: "c1", value: 5 }],
				qualitativeRatings: [],
			},
		]);

		assert.deepEqual(rows.slice(0, 2), [
			{
				criteriaId: "c1",
				values: [
					{ reviewerId: "r1", value: 2 },
					{ reviewerId: "r2", value: 5 },
				],
				mean: 3.5,
				spread: 3,
				texts: [],
			},
			{
				criteriaId: "c2",
				values: [
					{ reviewerId: "r1", value: 4 },
					{ reviewerId: "r2", value: null },
				],
				mean: 4,
				spread: null,
				texts: [],
			},
		]);
	});

	it("collects the written feedback of a qualitative criterion with its author", () => {
		const rows = buildCriterionRows(criteria, [
			{
				reviewerId: "r1",
				reviewerName: "Anna",
				quantitativeRatings: [],
				qualitativeRatings: [{ criteriaId: "q", text: "  Klar strukturiert " }],
			},
			{
				reviewerId: "r2",
				reviewerName: "Ben",
				quantitativeRatings: [],
				qualitativeRatings: [{ criteriaId: "q", text: "   " }],
			},
		]);

		assert.deepEqual(rows[2], {
			criteriaId: "q",
			values: [],
			mean: null,
			spread: null,
			texts: [
				{ reviewerId: "r1", reviewerName: "Anna", text: "Klar strukturiert" },
			],
		});
	});
});
