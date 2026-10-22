import { ShieldCheckIcon } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/format-date";
import { getResultsAccess } from "@/lib/results-access";
import { ROUTES } from "@/lib/routes";
import { getAcRole } from "@/server/ac-role";
import { db } from "@/server/db";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcResultsLayout({ children, params }: Props) {
	const { id } = await params;

	const [role, assessmentCenter] = await Promise.all([
		getAcRole(id),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { status: true, anonymizedAt: true },
		}),
	]);

	if (!assessmentCenter) {
		notFound();
	}

	// Reviewers only see completed results; everyone else goes back to rating.
	if (
		role !== "ADMIN" &&
		!getResultsAccess(role, assessmentCenter.status).canView
	) {
		redirect(ROUTES.acReview(id));
	}

	if (assessmentCenter.status === "DRAFT") {
		redirect(ROUTES.acSetupDetails(id));
	}

	if (assessmentCenter.status === "ACTIVE") {
		redirect(ROUTES.acOverview(id));
	}

	if (assessmentCenter.status === "ANONYMIZED") {
		return (
			<>
				<div className="mx-6 mt-6 flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-muted-foreground text-sm">
					<ShieldCheckIcon className="h-4 w-4 shrink-0" />
					Anonymisiert
					{assessmentCenter.anonymizedAt
						? ` am ${formatDate(assessmentCenter.anonymizedAt)}`
						: ""}
					: Namen sind ersetzt, Freitexte und Gruppenbeobachtungen gelöscht.
				</div>
				{children}
			</>
		);
	}

	return children;
}
