import { TRPCError } from "@trpc/server";
import { type AcStatus, isAcLocked } from "@/lib/ac-status";

/** Throws FORBIDDEN when the AC no longer accepts setup changes. */
export function assertAcEditable(status: AcStatus): void {
	if (!isAcLocked(status)) {
		return;
	}

	throw new TRPCError({
		code: "FORBIDDEN",
		message:
			status === "ANONYMIZED"
				? "Anonymisierte Assessment Center können nicht mehr bearbeitet werden."
				: "Abgeschlossene Assessment Center können nicht bearbeitet werden. Öffne das AC zuerst wieder.",
	});
}
