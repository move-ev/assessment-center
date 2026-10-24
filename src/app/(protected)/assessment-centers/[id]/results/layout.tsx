import { HourglassIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format-date";
import { ROUTES } from "@/lib/routes";
import { requireResultsAccess } from "@/server/ac-role";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcResultsLayout({ children, params }: Props) {
	const { id } = await params;
	const { assessmentCenter } = await requireResultsAccess(id);

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

	if (assessmentCenter.status === "ACTIVE") {
		return (
			<>
				<div className="mx-6 mt-6 flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-muted-foreground text-sm">
					<HourglassIcon className="h-4 w-4 shrink-0" />
					<span>
						Vorläufig: Das AC läuft noch, offene Bewertungen fehlen in den
						Werten. Export und Ressorts gibt es ab dem Abschluss. Was noch offen
						ist, zeigt die{" "}
						<Link
							className="text-primary underline underline-offset-4"
							href={ROUTES.acOverview(id)}
						>
							Live-Übersicht
						</Link>
						.
					</span>
				</div>
				{children}
			</>
		);
	}

	return children;
}
