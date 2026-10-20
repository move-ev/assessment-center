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
import { formatPercent } from "@/lib/format-percent";
import { ROUTES } from "@/lib/routes";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";
import type { RankingBand } from "../server/ranking";
import { DeviationBadge } from "./deviation-badge";
import { EvaluationCriteria } from "./evaluation-criteria";
import { EvaluationExport } from "./evaluation-export";
import { EvaluationTask } from "./evaluation-task";
import { RankingBandBadge } from "./ranking-band-badge";

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
					Aggregierte Bewertungen pro Bewerbende, Aufgabe und Kriterium.
				</p>
			</header>

			<SummaryGrid summary={results.summary} />

			<Tabs className="gap-4" defaultValue="participants">
				<TabsList>
					<TabsTrigger value="participants">Bewerbende</TabsTrigger>
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
					<EvaluationCriteria
						criteria={results.criteria}
						ratingScaleMax={results.ratingScaleMax}
					/>
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
				description="Anzahl der Bewerbenden mit quantitativer Gesamtauswertung."
				label="Bewerbende mit Score"
				value={`${summary.participantsWithScore} / ${summary.participantCount}`}
			/>
			<SummaryCard
				description="Gemittelter Gesamtwert über alle bewertbaren Bewerbenden."
				label="Durchschnitt"
				value={formatPercent(summary.averageOverallScore)}
			/>
			<SummaryCard
				description={`${summary.completionPercent}% aller Bewerter-Zuweisungen vollständig erfasst.`}
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

const RANKING_BAND_ROW: Record<RankingBand, string> = {
	TOP: "bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-950/60",
	BOTTOM:
		"bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60",
};

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
					<TableHead>Bewerbende</TableHead>
					<TableHead>Gruppe</TableHead>
					<TableHead>Gesamtwert</TableHead>
					<TableHead>Aufgaben</TableHead>
					<TableHead>Bewertungen</TableHead>
					<TableHead>Aufgaben-Details</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{participants.map((participant, index) => (
					<TableRow
						className={
							participant.rankingBand
								? RANKING_BAND_ROW[participant.rankingBand]
								: undefined
						}
						key={participant.id}
					>
						<TableCell className="font-medium">
							<div className="flex items-center gap-2">
								{index + 1}
								{participant.rankingBand && (
									<RankingBandBadge band={participant.rankingBand} />
								)}
							</div>
						</TableCell>
						<TableCell className="font-medium">
							<div className="flex flex-wrap items-center gap-2">
								<Link
									className="text-primary underline-offset-4 hover:underline"
									href={ROUTES.acResultsParticipant(acId, participant.id)}
								>
									{participant.name}
								</Link>
								{participant.deviatingTaskNames.length > 0 && (
									<DeviationBadge taskNames={participant.deviatingTaskNames} />
								)}
							</div>
						</TableCell>
						<TableCell className="text-muted-foreground">
							{participant.groupName ?? "Keine Gruppe"}
						</TableCell>
						<TableCell>{formatPercent(participant.overallScore)}</TableCell>
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
			{task.taskName}: {formatPercent(task.score)}
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
