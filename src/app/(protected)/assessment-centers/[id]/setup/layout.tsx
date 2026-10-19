import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AcSetupHub } from "@/modules/assessment-center";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcSetupLayout({ children, params }: Props) {
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

	if (session?.user.role !== "admin") {
		redirect(ROUTES.acReview(id));
	}

	return (
		<AcSetupHub acId={id} status={ac.status}>
			{children}
		</AcSetupHub>
	);
}
