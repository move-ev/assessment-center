import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";

type Props = {
	tasks: EvaluationResultsData["tasks"];
};

function EvaluationTask({ tasks }: Props) {
	if (tasks.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Es liegen noch keine Aufgaben mit Bewertungen vor.
			</p>
		);
	}

	return (
		<div className="grid gap-4 xl:grid-cols-2">
			{tasks.map((task) => (
				<Card key={task.id}>
					<CardHeader className="gap-3">
						<div className="flex items-start justify-between gap-3">
							<div className="space-y-1">
								<CardTitle className="text-base">{task.name}</CardTitle>
								<p className="text-muted-foreground text-sm">
									{task.participantCount} Bewerbende,{" "}
									{task.reviewerAssignmentCount} Bewertungen
								</p>
							</div>
							<Badge variant={task.isTeamTask ? "secondary" : "outline"}>
								{task.isTeamTask ? "Team" : "Einzeln"}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-2">
						<MetricCard
							label="Durchschnittsscore"
							value={formatScore(task.averageScore)}
						/>
						<MetricCard
							label="Abgeschlossene Bewertungen"
							value={`${task.completedAssignmentCount} / ${task.reviewerAssignmentCount}`}
						/>
						<MetricCard
							label="Qualitative Einträge"
							value={task.qualitativeEntryCount.toString()}
						/>
						<MetricCard
							label="Teambeobachtungen"
							value={task.teamObservationCount.toString()}
						/>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-3xl border bg-muted/30 p-4">
			<p className="text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</p>
			<p className="mt-2 font-semibold text-2xl">{value}</p>
		</div>
	);
}

function formatScore(value: number | null) {
	return value === null ? "n/a" : value.toFixed(2);
}

export { EvaluationTask };
