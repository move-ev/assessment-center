import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type { EvaluationParticipantDetailData } from "../server/get-evaluation-participant-detail-data";
import { EvaluationParticipantDetailDashboard } from "./evaluation-participant-detail-dashboard";

type Props = {
	acId: string;
	data: EvaluationParticipantDetailData;
};

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0] ?? "")
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function EvaluationParticipantDetail({ acId, data }: Props) {
	const hasData = data.views.some((view) => view.groups.length > 0);
	const initials = getInitials(data.participant.name);
	const { completedAssignmentCount, totalAssignmentCount, overallScore } =
		data.participant;

	return (
		<div className="space-y-6 p-6">
			<div className="space-y-5">
				<Link
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
					href={ROUTES.acResults(acId)}
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Ergebnisübersicht
				</Link>

				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
							{initials}
						</div>
						<div>
							<h1 className="font-semibold text-2xl tracking-tight">
								{data.participant.name}
							</h1>
							<p className="mt-0.5 text-sm text-muted-foreground">
								{data.participant.groupName ?? "Keine Gruppe"} ·{" "}
								{completedAssignmentCount} / {totalAssignmentCount} Bewertungen
								abgeschlossen
							</p>
						</div>
					</div>

					{overallScore !== null && (
						<div className="shrink-0 text-right">
							<p className="text-xs text-muted-foreground">Gesamtwert</p>
							<p className="font-bold text-3xl tabular-nums">
								{overallScore.toFixed(2)}
							</p>
						</div>
					)}
				</div>
			</div>

			{!hasData ? (
				<Card>
					<CardContent className="flex min-h-40 items-center justify-center">
						<p className="text-muted-foreground text-sm">
							Für diesen Teilnehmer liegen noch keine quantitativen
							Kriteriengruppen mit Bewertungen vor.
						</p>
					</CardContent>
				</Card>
			) : (
				<EvaluationParticipantDetailDashboard data={data} />
			)}
		</div>
	);
}

export { EvaluationParticipantDetail };
