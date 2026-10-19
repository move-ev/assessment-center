import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAcLocked } from "./ac-status.ts";

describe("isAcLocked", () => {
	it("locks setup changes once the AC is completed or anonymized", () => {
		assert.equal(isAcLocked("DRAFT"), false);
		assert.equal(isAcLocked("ACTIVE"), false);
		assert.equal(isAcLocked("COMPLETED"), true);
		assert.equal(isAcLocked("ANONYMIZED"), true);
	});
});
