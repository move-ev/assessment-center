import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcResultsLayout({ children, params }: Props) {
	const { id } = await params;

	const [session, assessmentCenter] = await Promise.all([
		getSession(),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { status: true },
		}),
	]);

	if (!assessmentCenter) {
		notFound();
	}

	if (session?.user.role !== "admin") {
		redirect(ROUTES.acReview(id));
	}

	if (assessmentCenter.status === "DRAFT") {
		redirect(ROUTES.acSetupDetails(id));
	}

	if (assessmentCenter.status === "ACTIVE") {
		redirect(ROUTES.acOverview(id));
	}

	return children;
}
