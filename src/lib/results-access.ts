import type { AcRole } from "./ac-role.ts";
import type { AcStatus } from "./ac-status.ts";

export type ResultsAccess = {
	/** May open the results pages. */
	canView: boolean;
	/** May export and change anything on them (admins only). */
	canManage: boolean;
};

const NO_ACCESS: ResultsAccess = { canView: false, canManage: false };

/**
 * Who sees an AC's results. Admins follow them while the AC runs, read-only
 * since the numbers are still provisional; export and changes open once it
 * is completed. Reviewers read them only once completed, so nobody is swayed
 * while rating, and nobody but admins keeps access once the AC is anonymized.
 */
export function getResultsAccess(
	role: AcRole,
	status: AcStatus,
): ResultsAccess {
	if (role === "ADMIN") {
		if (status === "COMPLETED" || status === "ANONYMIZED") {
			return { canView: true, canManage: true };
		}
		return status === "ACTIVE"
			? { canView: true, canManage: false }
			: NO_ACCESS;
	}
	if (role === "REVIEWER" && status === "COMPLETED") {
		return { canView: true, canManage: false };
	}
	return NO_ACCESS;
}
