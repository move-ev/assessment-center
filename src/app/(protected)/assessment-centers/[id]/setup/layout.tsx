import { notFound, redirect } from "next/navigation";
import { AcSetupHub } from "@/modules/assessment-center";
import { ROUTES } from "@/lib/routes";
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

	// DRAFT and ACTIVE allow full editing; COMPLETED ACs are read-only until reopened.
	const isReadOnly = ac.status === "COMPLETED";

	return (
		<AcSetupHub acId={id} isReadOnly={isReadOnly}>
			{children}
		</AcSetupHub>
	);
}
