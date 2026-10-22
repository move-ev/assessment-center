import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getQualitativeWrite } from "./qualitative-write.ts";

describe("getQualitativeWrite", () => {
	it("saves free text trimmed", () => {
		assert.deepEqual(getQualitativeWrite("  Klar strukturiert \n"), {
			kind: "SAVE",
			text: "Klar strukturiert",
		});
	});

	it("deletes the entry when the text is cleared, blanks included", () => {
		assert.deepEqual(getQualitativeWrite(""), { kind: "DELETE" });
		assert.deepEqual(getQualitativeWrite("  \n\t "), { kind: "DELETE" });
	});
});
