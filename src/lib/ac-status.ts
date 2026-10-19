export type AcStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ANONYMIZED";

export const AC_STATUS_LABEL: Record<AcStatus, string> = {
	DRAFT: "Entwurf",
	ACTIVE: "Aktiv",
	COMPLETED: "Abgeschlossen",
	ANONYMIZED: "Anonymisiert",
};

/**
 * Completed and anonymized ACs no longer accept setup changes. A completed
 * AC can be reopened; an anonymized one is read-only for good.
 */
export function isAcLocked(status: AcStatus): boolean {
	return status === "COMPLETED" || status === "ANONYMIZED";
}
