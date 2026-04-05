import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { ROUTES } from "@/lib/routes";
import type { ReviewLayoutData } from "../server/get-review-layout-data";

type Props = {
	acId: string;
	summary: ReviewLayoutData;
	children: React.ReactNode;
};

function ReviewLayout({ acId, summary, children }: Props) {
	return (
		<div className="flex flex-1 flex-col">
			<div className="border-b px-6 py-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-1">
						<p className="font-medium text-lg">Review Workspace</p>
						<p className="text-muted-foreground text-sm">
							{summary.reviewerName} bewertet {summary.taskCount} Aufgaben und{" "}
							{summary.totalAssignments} Zuweisungen.
						</p>
					</div>
					<Link
						className="text-primary text-sm underline underline-offset-4"
						href={ROUTES.acReview(acId)}
					>
						Alle Aufgaben anzeigen
					</Link>
				</div>
				<div className="mt-4 space-y-2">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="font-medium">Eigener Fortschritt</span>
						<span className="text-muted-foreground">
							{summary.completedAssignments} / {summary.reviewableAssignments}{" "}
							vollständig
						</span>
					</div>
					<Progress value={summary.progressPercent} />
				</div>
			</div>
			<div className="flex-1">{children}</div>
		</div>
	);
}

export { ReviewLayout };
