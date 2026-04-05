import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcLayout({ children, params }: Props) {
	const { id } = await params;

	const [session, ac] = await Promise.all([
		getSession(),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { id: true },
		}),
	]);

	if (!ac) {
		notFound();
	}

	const isAdmin = session?.user.role === "admin";
	const isReviewer =
		!isAdmin &&
		(await db.reviewer.findFirst({
			where: { assessmentCenterId: id, userId: session?.user.id ?? "" },
			select: { id: true },
		})) !== null;

	if (!isAdmin && !isReviewer) {
		redirect(ROUTES.dashboard());
	}

	return <>{children}</>;
}
