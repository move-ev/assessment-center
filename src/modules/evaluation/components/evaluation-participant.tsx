import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/lib/routes";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";
import { EvaluationCriteria } from "./evaluation-criteria";
import { EvaluationExport } from "./evaluation-export";
import { EvaluationTask } from "./evaluation-task";

type Props = {
	acId: string;
	acName: string;
	results: EvaluationResultsData;
};

function EvaluationParticipant({ acId, acName, results }: Props) {
	if (results.participants.length === 0) {
		return <ResultsEmptyState acId={acId} />;
	}

	return (
		<div className="space-y-6 p-6">
			<header className="space-y-1">
				<h1 className="font-medium text-xl">Ergebnisse</h1>
				<p className="text-muted-foreground text-sm">
					Aggregierte Bewertungen pro Teilnehmer, Aufgabe und Kriterium.
				</p>
			</header>

			<SummaryGrid summary={results.summary} />

			<Tabs className="gap-4" defaultValue="participants">
				<TabsList>
					<TabsTrigger value="participants">Teilnehmer</TabsTrigger>
					<TabsTrigger value="tasks">Aufgaben</TabsTrigger>
					<TabsTrigger value="criteria">Kriterien</TabsTrigger>
					<TabsTrigger value="export">Export</TabsTrigger>
				</TabsList>

				<TabsContent value="participants">
					<ParticipantTable acId={acId} participants={results.participants} />
				</TabsContent>
				<TabsContent value="tasks">
					<EvaluationTask tasks={results.tasks} />
				</TabsContent>
				<TabsContent value="criteria">
					<EvaluationCriteria criteria={results.criteria} />
				</TabsContent>
				<TabsContent value="export">
					<EvaluationExport acName={acName} rows={results.exportRows} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function SummaryGrid({
	summary,
}: {
	summary: EvaluationResultsData["summary"];
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<SummaryCard
				description="Anzahl der Teilnehmer mit quantitativer Gesamtauswertung."
				label="Teilnehmer mit Score"
				value={`${summary.participantsWithScore} / ${summary.participantCount}`}
			/>
			<SummaryCard
				description="Gemittelter Gesamtwert über alle bewertbaren Teilnehmer."
				label="Durchschnitt"
				value={
					summary.averageOverallScore === null
						? "n/a"
						: summary.averageOverallScore.toFixed(2)
				}
			/>
			<SummaryCard
				description={`${summary.completionPercent}% aller Reviewer-Zuweisungen vollständig erfasst.`}
				label="Bewertungen"
				value={`${summary.completedAssignments} / ${summary.totalAssignments}`}
			/>
			<SummaryCard
				description={`${summary.teamObservationCount} Teambeobachtungen über ${summary.taskCount} Aufgaben.`}
				label="Qualitatives Feedback"
				value={`${summary.qualitativeEntries}`}
			/>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	description,
}: {
	label: string;
	value: string;
	description: string;
}) {
	return (
		<Card size="sm">
			<CardHeader className="pb-0">
				<CardTitle className="text-muted-foreground text-sm">{label}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1">
				<p className="font-semibold text-2xl">{value}</p>
				<p className="text-muted-foreground text-sm">{description}</p>
			</CardContent>
		</Card>
	);
}

function ParticipantTable({
	acId,
	participants,
}: {
	acId: string;
	participants: EvaluationResultsData["participants"];
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Rang</TableHead>
					<TableHead>Teilnehmer</TableHead>
					<TableHead>Gruppe</TableHead>
					<TableHead>Gesamtwert</TableHead>
					<TableHead>Aufgaben</TableHead>
					<TableHead>Bewertungen</TableHead>
					<TableHead>Aufgaben-Details</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{participants.map((participant, index) => (
					<TableRow key={participant.id}>
						<TableCell className="font-medium">{index + 1}</TableCell>
						<TableCell className="font-medium">
							<Link
								className="text-primary underline-offset-4 hover:underline"
								href={ROUTES.acResultsParticipant(acId, participant.id)}
							>
								{participant.name}
							</Link>
						</TableCell>
						<TableCell className="text-muted-foreground">
							{participant.groupName ?? "Keine Gruppe"}
						</TableCell>
						<TableCell>
							{participant.overallScore === null
								? "n/a"
								: participant.overallScore.toFixed(2)}
						</TableCell>
						<TableCell className="text-muted-foreground">
							{participant.completedTaskCount} / {participant.totalTaskCount}
						</TableCell>
						<TableCell className="text-muted-foreground">
							{participant.completedAssignmentCount} /{" "}
							{participant.totalAssignmentCount}
						</TableCell>
						<TableCell className="max-w-xl whitespace-normal">
							<div className="flex flex-wrap gap-2">
								{participant.taskResults.map((task) => (
									<TaskBadge key={task.taskId} task={task} />
								))}
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function TaskBadge({
	task,
}: {
	task: EvaluationResultsData["participants"][number]["taskResults"][number];
}) {
	return (
		<Badge variant={task.score === null ? "outline" : "secondary"}>
			{task.taskName}: {task.score === null ? "n/a" : task.score.toFixed(2)}
		</Badge>
	);
}

function ResultsEmptyState({ acId }: { acId: string }) {
	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<Empty className="max-w-xl border">
				<EmptyHeader>
					<EmptyTitle>Noch keine Ergebnisse verfügbar</EmptyTitle>
					<EmptyDescription>
						Für dieses Assessment Center liegen noch keine Bewertungen vor.
						Prüfe zuerst Zuweisungen und abgeschlossene Reviews unter{" "}
						<a href={ROUTES.acOverview(acId)}>Live-Übersicht</a>.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	);
}

export { EvaluationParticipant };
