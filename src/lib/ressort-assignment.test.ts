import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getSlotStatus,
	groupByRessort,
	matchesRessortFilter,
	parseRessortFilter,
	sortByRank,
	toRessortFilterValue,
} from "./ressort-assignment.ts";

const person = (id: string, ressortId: string | null) => ({ id, ressortId });
const countIn = (
	groups: ReturnType<typeof groupByRessort>,
	ressortId: string,
) => groups.get(ressortId)?.length ?? 0;

describe("groupByRessort", () => {
	it("groups assigned people per ressort and skips unassigned ones", () => {
		const groups = groupByRessort([
			person("p1", "it"),
			person("p2", null),
			person("p3", "it"),
			person("p4", "marketing"),
		]);
		assert.deepEqual(
			groups.get("it")?.map((p) => p.id),
			["p1", "p3"],
		);
		assert.equal(countIn(groups, "marketing"), 1);
		assert.equal(groups.size, 2);
	});

	it("follows assigning, reassigning and removing", () => {
		const unassigned = groupByRessort([person("p1", null), person("p2", null)]);
		assert.equal(unassigned.size, 0);
		const assigned = groupByRessort([person("p1", "it"), person("p2", null)]);
		assert.equal(countIn(assigned, "it"), 1);
		// moving p1 frees the place in it
		const reassigned = groupByRessort([
			person("p1", "marketing"),
			person("p2", null),
		]);
		assert.equal(countIn(reassigned, "it"), 0);
		assert.equal(countIn(reassigned, "marketing"), 1);
		const removed = groupByRessort([person("p1", null), person("p2", null)]);
		assert.equal(removed.size, 0);
	});
});

describe("sortByRank", () => {
	it("puts the best rank first and people without a rank last", () => {
		const sorted = sortByRank(
			[{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
			{ a: 3, b: null, c: 1 },
		);
		assert.deepEqual(
			sorted.map((p) => p.id),
			["c", "a", "b", "d"],
		);
	});
});

describe("getSlotStatus", () => {
	it("says how many places are still open", () => {
		assert.deepEqual(getSlotStatus(4, 1), {
			freeSlots: 3,
			overBy: 0,
			label: "noch 3 frei",
		});
		assert.deepEqual(getSlotStatus(4, 3), {
			freeSlots: 1,
			overBy: 0,
			label: "noch 1 frei",
		});
	});

	it("says full when exactly the target is assigned", () => {
		assert.deepEqual(getSlotStatus(2, 2), {
			freeSlots: 0,
			overBy: 0,
			label: "voll",
		});
	});

	it("warns how far the target is exceeded", () => {
		assert.deepEqual(getSlotStatus(2, 4), {
			freeSlots: -2,
			overBy: 2,
			label: "2 über dem Ziel",
		});
	});

	it("has no target, no free places and no warning without numbers", () => {
		assert.deepEqual(getSlotStatus(null, 3), {
			freeSlots: null,
			overBy: 0,
			label: null,
		});
	});
});

describe("ressort filter", () => {
	it("reads all, unassigned or one ressort from the URL value", () => {
		assert.deepEqual(parseRessortFilter(undefined), { kind: "all" });
		assert.deepEqual(parseRessortFilter(""), { kind: "all" });
		assert.deepEqual(parseRessortFilter("none"), { kind: "none" });
		assert.deepEqual(parseRessortFilter("r1"), {
			kind: "ressort",
			ressortId: "r1",
		});
	});

	it("turns a filter back into its URL value", () => {
		for (const value of ["", "none", "r1"]) {
			assert.equal(toRessortFilterValue(parseRessortFilter(value)), value);
		}
	});

	it("matches people by their ressort", () => {
		const all = parseRessortFilter(undefined);
		const none = parseRessortFilter("none");
		const it1 = parseRessortFilter("r1");
		assert.equal(matchesRessortFilter("r1", all), true);
		assert.equal(matchesRessortFilter(null, all), true);
		assert.equal(matchesRessortFilter(null, none), true);
		assert.equal(matchesRessortFilter("r1", none), false);
		assert.equal(matchesRessortFilter("r1", it1), true);
		assert.equal(matchesRessortFilter("r2", it1), false);
		assert.equal(matchesRessortFilter(null, it1), false);
	});
});
