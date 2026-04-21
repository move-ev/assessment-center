import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type { EvaluationParticipantDetailData } from "../server/get-evaluation-participant-detail-data";
import { EvaluationParticipantDetailDashboard } from "./evaluation-participant-detail-dashboard";

type Props = {
	acId: string;
	data: EvaluationParticipantDetailData;
};

function EvaluationParticipantDetail({ acId, data }: Props) {
	return (
		<div className="space-y-6 p-6">
			<header className="space-y-3">
				<Link
					className="text-primary text-sm underline underline-offset-4"
					href={ROUTES.acResults(acId)}
				>
					Zurück zur Ergebnisübersicht
				</Link>
				<div className="space-y-1">
					<h1 className="font-medium text-xl">{data.participant.name}</h1>
					<p className="text-muted-foreground text-sm">
						{data.participant.groupName ?? "Keine Gruppe"} ·{" "}
						{data.participant.completedAssignmentCount} /{" "}
						{data.participant.totalAssignmentCount} Bewertungen abgeschlossen
					</p>
				</div>
			</header>

			{data.views.every((view) => view.groups.length === 0) ? (
				<Card>
					<CardContent className="flex min-h-64 items-center justify-center">
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
