import { notFound, redirect } from "next/navigation";
import { getResultsAccess } from "@/lib/results-access";
import { ROUTES } from "@/lib/routes";
import { AcHeader, AcNav } from "@/modules/assessment-center";
import { getAcRole } from "@/server/ac-role";
import { db } from "@/server/db";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcLayout({ children, params }: Props) {
	const { id } = await params;

	const [role, ac] = await Promise.all([
		getAcRole(id),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { id: true, name: true, status: true },
		}),
	]);

	if (!ac) {
		notFound();
	}

	const isAdmin = role === "ADMIN";

	// Anonymized ACs are only visible to admins.
	if (role === "NONE" || (!isAdmin && ac.status === "ANONYMIZED")) {
		redirect(ROUTES.dashboard());
	}

	return (
		<div className="flex min-h-screen flex-col">
			<AcHeader id={id} name={ac.name} status={ac.status} />
			<AcNav
				acId={id}
				acStatus={ac.status}
				canViewResults={getResultsAccess(role, ac.status).canView}
				isAdmin={isAdmin}
			/>
			<div className="flex flex-1 flex-col">{children}</div>
		</div>
	);
}
