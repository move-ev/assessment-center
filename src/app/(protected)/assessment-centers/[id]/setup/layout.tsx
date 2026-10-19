import { notFound, redirect } from "next/navigation";
import { isAcLocked } from "@/lib/ac-status";
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

	// DRAFT and ACTIVE allow full editing; COMPLETED ACs are read-only until
	// reopened, ANONYMIZED ACs for good.
	const isReadOnly = isAcLocked(ac.status);

	return (
		<AcSetupHub
			acId={id}
			isAnonymized={ac.status === "ANONYMIZED"}
			isReadOnly={isReadOnly}
		>
			{children}
		</AcSetupHub>
	);
}
