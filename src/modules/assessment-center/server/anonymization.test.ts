import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignPseudonyms } from "./anonymization.ts";

describe("assignPseudonyms", () => {
	it("numbers every id once, 1 to n", () => {
		const pseudonyms = assignPseudonyms(["a", "b", "c", "d"], "Bewerbende");

		assert.deepEqual([...pseudonyms.values()].sort(), [
			"Bewerbende 1",
			"Bewerbende 2",
			"Bewerbende 3",
			"Bewerbende 4",
		]);
		assert.deepEqual([...pseudonyms.keys()].sort(), ["a", "b", "c", "d"]);
	});

	it("shuffles with the given random source instead of keeping the input order", () => {
		// random() = 0 always swaps with the first slot: [a,b,c] -> [b,c,a]
		const pseudonyms = assignPseudonyms(["a", "b", "c"], "Bewerbende", () => 0);

		assert.equal(pseudonyms.get("b"), "Bewerbende 1");
		assert.equal(pseudonyms.get("c"), "Bewerbende 2");
		assert.equal(pseudonyms.get("a"), "Bewerbende 3");
	});

	it("keeps the input order when asked to", () => {
		const pseudonyms = assignPseudonyms(["x", "y"], "Gruppe", null);

		assert.equal(pseudonyms.get("x"), "Gruppe 1");
		assert.equal(pseudonyms.get("y"), "Gruppe 2");
	});
});
