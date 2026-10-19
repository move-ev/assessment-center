import "server-only";

import { notFound } from "next/navigation";
import type { AcStatus } from "@/lib/ac-status";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

export type ReviewSession = {
	acId: string;
	reviewerId: string;
	reviewerName: string;
	acName: string;
	status: AcStatus;
};

export async function getReviewSession(acId: string): Promise<ReviewSession> {
	const session = await getSession();
	const userId = session?.user.id;

	if (!userId) {
		notFound();
	}

	const reviewer = await db.reviewer.findFirst({
		where: { assessmentCenterId: acId, userId },
		select: {
			id: true,
			user: { select: { name: true } },
			assessmentCenter: {
				select: {
					id: true,
					name: true,
					status: true,
				},
			},
		},
	});

	if (!reviewer) {
		notFound();
	}

	return {
		acId: reviewer.assessmentCenter.id,
		reviewerId: reviewer.id,
		reviewerName: reviewer.user.name,
		acName: reviewer.assessmentCenter.name,
		status: reviewer.assessmentCenter.status,
	};
}
