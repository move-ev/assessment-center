import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { AcRole } from "@/lib/ac-role";
import { getResultsAccess } from "@/lib/results-access";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

/**
 * The signed-in user's role in one AC: admin, one of its reviewers, or
 * neither. Cached per request, as layouts and pages all ask.
 */
export const getAcRole = cache(async (acId: string): Promise<AcRole> => {
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
});

/**
 * Guard for every results page and its layout: pages check too, because
 * Next.js renders layouts and pages in parallel and keeps layouts on client
 * navigation. Sends whoever may not view to where they belong instead.
 */
export const requireResultsAccess = cache(async (acId: string) => {
	const [role, assessmentCenter] = await Promise.all([
		getAcRole(acId),
		db.assessmentCenter.findFirst({
			where: { id: acId, deletedAt: null },
			select: { name: true, status: true, anonymizedAt: true },
		}),
	]);

	if (!assessmentCenter) {
		notFound();
	}

	const access = getResultsAccess(role, assessmentCenter.status);
	if (!access.canView) {
		if (role !== "ADMIN") {
			redirect(ROUTES.acReview(acId));
		}
		redirect(
			assessmentCenter.status === "DRAFT"
				? ROUTES.acSetupDetails(acId)
				: ROUTES.acOverview(acId),
		);
	}

	return { ...access, assessmentCenter };
});
