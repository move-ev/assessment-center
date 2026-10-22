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
 * Who sees an AC's results. Results exist once the AC is completed; reviewers
 * read them only then, so nobody is swayed while rating and nobody but admins
 * keeps access once the AC is anonymized. Changing anything stays with admins.
 */
export function getResultsAccess(
	role: AcRole,
	status: AcStatus,
): ResultsAccess {
	if (role === "ADMIN") {
		return status === "COMPLETED" || status === "ANONYMIZED"
			? { canView: true, canManage: true }
			: NO_ACCESS;
	}
	if (role === "REVIEWER" && status === "COMPLETED") {
		return { canView: true, canManage: false };
	}
	return NO_ACCESS;
}
