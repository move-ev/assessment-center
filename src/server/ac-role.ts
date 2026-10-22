import "server-only";

import type { AcRole } from "@/lib/results-access";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

/** The signed-in user's role in one AC: admin, one of its reviewers, or neither. */
export async function getAcRole(acId: string): Promise<AcRole> {
	const session = await getSession();
	if (!session) {
		return "NONE";
	}
	if (session.user.role === "admin") {
		return "ADMIN";
	}

	const reviewer = await db.reviewer.findFirst({
		where: { assessmentCenterId: acId, userId: session.user.id },
		select: { id: true },
	});
	return reviewer ? "REVIEWER" : "NONE";
}
