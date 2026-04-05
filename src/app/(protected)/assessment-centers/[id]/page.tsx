import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcRootPage({ params }: Props) {
	const { id } = await params;

	const [session, ac] = await Promise.all([
		getSession(),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { status: true },
		}),
	]);

	if (!ac) {
		notFound();
	}

	const isAdmin = session?.user.role === "admin";

	if (!isAdmin) {
		redirect(ROUTES.acReview(id));
	}

	if (ac.status === "DRAFT") {
		redirect(ROUTES.acSetupDetails(id));
	}

	if (ac.status === "ACTIVE") {
		redirect(ROUTES.acOverview(id));
	}

	redirect(ROUTES.acResults(id));
}
