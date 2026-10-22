import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getResultsAccess } from "./results-access.ts";

describe("getResultsAccess", () => {
	it("lets reviewers of the AC read the results once it is completed, without managing them", () => {
		assert.deepEqual(getResultsAccess("REVIEWER", "COMPLETED"), {
			canView: true,
			canManage: false,
		});
	});

	it("keeps the results from reviewers while rating runs and after anonymizing", () => {
		for (const status of ["DRAFT", "ACTIVE", "ANONYMIZED"] as const) {
			assert.deepEqual(getResultsAccess("REVIEWER", status), {
				canView: false,
				canManage: false,
			});
		}
	});

	it("lets admins view and manage completed and anonymized results", () => {
		for (const status of ["COMPLETED", "ANONYMIZED"] as const) {
			assert.deepEqual(getResultsAccess("ADMIN", status), {
				canView: true,
				canManage: true,
			});
		}
		assert.equal(getResultsAccess("ADMIN", "ACTIVE").canView, false);
	});

	it("gives nobody else access", () => {
		assert.deepEqual(getResultsAccess("NONE", "COMPLETED"), {
			canView: false,
			canManage: false,
		});
	});
});
