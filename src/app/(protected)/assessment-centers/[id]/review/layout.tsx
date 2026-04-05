import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getReviewLayoutData, ReviewLayout } from "@/modules/review";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcReviewLayout({ children, params }: Props) {
	const { id } = await params;
	const session = await getSession();

	const [reviewer, assessmentCenter] = await Promise.all([
		db.reviewer.findFirst({
			where: { assessmentCenterId: id, userId: session?.user.id ?? "" },
			select: { id: true },
		}),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { status: true },
		}),
	]);

	if (!assessmentCenter) {
		notFound();
	}

	if (!reviewer) {
		if (session?.user.role === "admin") {
			redirect(ROUTES.ac(id));
		}

		redirect(ROUTES.dashboard());
	}

	if (assessmentCenter.status === "DRAFT") {
		redirect(ROUTES.dashboard());
	}

	const summary = await getReviewLayoutData(id);

	return (
		<ReviewLayout acId={id} summary={summary}>
			{children}
		</ReviewLayout>
	);
}
