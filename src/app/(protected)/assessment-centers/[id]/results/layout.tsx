import { ShieldCheckIcon } from "lucide-react";
import { formatDate } from "@/lib/format-date";
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

	return children;
}
