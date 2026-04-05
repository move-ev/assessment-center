import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AcHeader, AcNav } from "@/modules/assessment-center";
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
			select: { id: true, name: true, status: true },
		}),
	]);

	if (!ac) {
		notFound();
	}

	const isAdmin = session?.user.role === "admin";
	const reviewer = isAdmin
		? null
		: await db.reviewer.findFirst({
				where: { assessmentCenterId: id, userId: session?.user.id ?? "" },
				select: { id: true },
			});
	const isReviewer = reviewer !== null;

	if (!isAdmin && !isReviewer) {
		redirect(ROUTES.dashboard());
	}

	return (
		<div className="flex min-h-screen flex-col">
			<AcHeader id={id} name={ac.name} status={ac.status} />
			<AcNav acId={id} acStatus={ac.status} isAdmin={isAdmin} />
			<div className="flex flex-1 flex-col">{children}</div>
		</div>
	);
}
