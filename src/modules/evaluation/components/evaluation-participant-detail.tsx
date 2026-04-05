import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { ROUTES } from "@/lib/routes";
import type { EvaluationParticipantDetailData } from "../server/get-evaluation-participant-detail-data";

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

			<SummaryGrid participant={data.participant} />

			{data.tasks.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyTitle>Keine Aufgabenbewertungen vorhanden</EmptyTitle>
						<EmptyDescription>
							Für diesen Teilnehmer wurden noch keine Aufgaben zugewiesen oder
							bewertet.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="space-y-6">
					{data.tasks.map((task) => (
						<TaskCard key={task.id} task={task} />
					))}
				</div>
			)}
		</div>
	);
}

function SummaryGrid({
	participant,
}: {
	participant: EvaluationParticipantDetailData["participant"];
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<SummaryCard
				description="Gewichteter Durchschnitt über alle quantitativen Aufgaben."
				label="Gesamtwert"
				value={
					participant.overallScore === null
						? "n/a"
						: participant.overallScore.toFixed(2)
				}
			/>
			<SummaryCard
				description="Vollständig erfasste Aufgaben für diesen Teilnehmer."
				label="Aufgaben"
				value={`${participant.completedTaskCount} / ${participant.totalTaskCount}`}
			/>
			<SummaryCard
				description="Reviewer-Zuweisungen mit vollständig erfassten Kriterien."
				label="Bewertungen"
				value={`${participant.completedAssignmentCount} / ${participant.totalAssignmentCount}`}
			/>
			<SummaryCard
				description="Qualitative Rückmeldungen und Teamnotizen."
				label="Feedback"
				value={`${participant.qualitativeEntries} / ${participant.teamObservationCount}`}
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

function TaskCard({
	task,
}: {
	task: EvaluationParticipantDetailData["tasks"][number];
}) {
	return (
		<Card>
			<CardHeader className="gap-3">
				<div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<CardTitle className="text-base">{task.name}</CardTitle>
							<Badge variant={task.isTeamTask ? "secondary" : "outline"}>
								{task.isTeamTask ? "Team" : "Einzeln"}
							</Badge>
						</div>
						{task.description && (
							<p className="text-muted-foreground text-sm">
								{task.description}
							</p>
						)}
					</div>
					<div className="text-right text-sm">
						<p className="font-medium">
							{task.score === null ? "n/a" : task.score.toFixed(2)}
						</p>
						<p className="text-muted-foreground">
							{task.completedAssignments} / {task.totalAssignments} vollständig
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					<MetricTile
						label="Score"
						value={task.score === null ? "n/a" : task.score.toFixed(2)}
					/>
					<MetricTile
						label="Bewertungen"
						value={`${task.completedAssignments} / ${task.totalAssignments}`}
					/>
					<MetricTile
						label="Kriterien"
						value={task.criteria.length.toString()}
					/>
					<MetricTile
						label="Teamnotizen"
						value={task.teamObservations.length.toString()}
					/>
				</div>

				<div className="space-y-4">
					{task.criteria.map((criterion) => (
						<CriterionCard criterion={criterion} key={criterion.id} />
					))}
				</div>

				{task.teamObservations.length > 0 && (
					<div className="space-y-3">
						<h3 className="font-medium text-sm">Teambeobachtungen</h3>
						<div className="grid gap-3">
							{task.teamObservations.map((observation) => (
								<div
									className="rounded-3xl border bg-muted/20 p-4"
									key={`${task.id}-${observation.reviewerName}`}
								>
									<p className="font-medium text-sm">
										{observation.reviewerName}
									</p>
									<p className="mt-2 whitespace-pre-wrap text-sm">
										{observation.notes}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function MetricTile({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-3xl border bg-muted/30 p-4">
			<p className="text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</p>
			<p className="mt-2 font-semibold text-2xl">{value}</p>
		</div>
	);
}

function CriterionCard({
	criterion,
}: {
	criterion: EvaluationParticipantDetailData["tasks"][number]["criteria"][number];
}) {
	return (
		<div className="rounded-3xl border p-4">
			<div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<p className="font-medium">{criterion.name}</p>
						<Badge
							variant={
								criterion.type === "QUANTITATIVE" ? "secondary" : "outline"
							}
						>
							{criterion.type === "QUANTITATIVE" ? "Quantitativ" : "Qualitativ"}
						</Badge>
					</div>
					{criterion.description && (
						<p className="text-muted-foreground text-sm">
							{criterion.description}
						</p>
					)}
				</div>
				{criterion.type === "QUANTITATIVE" && (
					<div className="text-right text-sm">
						<p className="font-medium">
							{criterion.averageScore === null
								? "n/a"
								: criterion.averageScore.toFixed(2)}
						</p>
						<p className="text-muted-foreground">
							Gewicht {criterion.weight.toFixed(2)}
						</p>
					</div>
				)}
			</div>

			{criterion.type === "QUANTITATIVE" ? (
				<div className="mt-4 grid gap-3 md:grid-cols-2">
					{criterion.ratings.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Noch keine Bewertungen vorhanden.
						</p>
					) : (
						criterion.ratings.map((rating) => (
							<div
								className="rounded-2xl bg-muted/20 p-4"
								key={`${criterion.id}-${rating.reviewerName}`}
							>
								<div className="flex items-center justify-between gap-3">
									<p className="font-medium text-sm">{rating.reviewerName}</p>
									<Badge>{rating.value}</Badge>
								</div>
								{rating.notes && (
									<p className="mt-2 whitespace-pre-wrap text-sm">
										{rating.notes}
									</p>
								)}
							</div>
						))
					)}
				</div>
			) : (
				<div className="mt-4 grid gap-3">
					{criterion.textEntries.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Noch kein qualitatives Feedback vorhanden.
						</p>
					) : (
						criterion.textEntries.map((entry) => (
							<div
								className="rounded-2xl bg-muted/20 p-4"
								key={`${criterion.id}-${entry.reviewerName}`}
							>
								<p className="font-medium text-sm">{entry.reviewerName}</p>
								<p className="mt-2 whitespace-pre-wrap text-sm">{entry.text}</p>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}

export { EvaluationParticipantDetail };
