import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCapacityError, getFreeSlots } from "./ressort-capacity.ts";

describe("getCapacityError", () => {
	it("accepts whole numbers from 0 with no more active than registered", () => {
		assert.equal(
			getCapacityError({ registered: 12, active: 9, toAdmit: 4 }),
			null,
		);
		assert.equal(
			getCapacityError({ registered: 0, active: 0, toAdmit: 0 }),
			null,
		);
	});

	it("refuses more active members than registered ones", () => {
		assert.equal(
			getCapacityError({ registered: 5, active: 6, toAdmit: 2 }),
			"Aktiv kann nicht größer sein als gemeldet.",
		);
	});

	it("refuses numbers above the maximum", () => {
		assert.equal(
			getCapacityError({ registered: 10_000, active: 0, toAdmit: 0 }),
			"Nur ganze Zahlen von 0 bis 9999.",
		);
		assert.equal(
			getCapacityError({ registered: 9999, active: 9999, toAdmit: 9999 }),
			null,
		);
	});

	it("refuses negative or fractional numbers", () => {
		assert.equal(
			getCapacityError({ registered: -1, active: 0, toAdmit: 0 }),
			"Nur ganze Zahlen von 0 bis 9999.",
		);
		assert.equal(
			getCapacityError({ registered: 3, active: 1.5, toAdmit: 0 }),
			"Nur ganze Zahlen von 0 bis 9999.",
		);
	});
});

describe("getFreeSlots", () => {
	it("counts the places still open, negative when more are assigned than planned", () => {
		assert.equal(getFreeSlots(4, 1), 3);
		assert.equal(getFreeSlots(4, 4), 0);
		assert.equal(getFreeSlots(2, 4), -2);
	});
});
