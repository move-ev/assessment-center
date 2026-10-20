import { ArrowLeft, ListChecks, Users } from "lucide-react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatPercent, formatSpread } from "@/lib/format-percent";
import { ROUTES } from "@/lib/routes";
import type { EvaluationParticipantDetailData } from "../server/get-evaluation-participant-detail-data";
import { CriteriaDrilldown } from "./criteria-drilldown";
import { CriteriaStrengths } from "./criteria-strengths";
import { DeviationBadge } from "./deviation-badge";
import { ReviewerBreakdownCard } from "./evaluation-reviewer-breakdown";
import { ParticipantAtAGlance } from "./participant-at-a-glance";
import { RankingBandBadge } from "./ranking-band-badge";

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
	const initials = getInitials(data.participant.name);
	const {
		completedAssignmentCount,
		totalAssignmentCount,
		overallScore,
		rank,
		rankedCount,
		rankingBand,
	} = data.participant;

	return (
		<div className="space-y-6 p-6">
			<div className="space-y-5">
				<Link
					className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
					href={ROUTES.acResults(acId)}
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Ergebnisübersicht
				</Link>

				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
							{initials}
						</div>
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="font-semibold text-2xl tracking-tight">
									{data.participant.name}
								</h1>
								{data.participant.deviatingTaskNames.length > 0 && (
									<DeviationBadge
										label="Starke Abweichung"
										taskNames={data.participant.deviatingTaskNames}
									/>
								)}
							</div>
							<p className="mt-0.5 text-muted-foreground text-sm">
								{data.participant.groupName ?? "Keine Gruppe"} ·{" "}
								{completedAssignmentCount} / {totalAssignmentCount} Bewertungen
								abgeschlossen
							</p>
						</div>
					</div>

					{overallScore !== null && (
						<div className="shrink-0 space-y-1 text-right">
							<p className="text-muted-foreground text-xs">Gesamtwert</p>
							<p className="font-bold text-3xl tabular-nums">
								{formatPercent(overallScore)}
							</p>
							{rank !== null && (
								<div className="flex items-center justify-end gap-2">
									{rankingBand && <RankingBandBadge band={rankingBand} />}
									<p className="text-muted-foreground text-sm">
										Rang {rank} von {rankedCount}
									</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<ParticipantAtAGlance
				expectationPercent={data.expectationPercent}
				participant={data.participant}
				taskScores={data.taskScores}
			/>

			<CriteriaStrengths criteria={data.criterionComparisons} />

			<ReviewerBreakdownCard
				data={data.reviewerBreakdown}
				taskScores={data.taskScores}
			/>

			<TaskScoresCard taskScores={data.taskScores} />

			<CriteriaDrilldown
				breakdown={data.reviewerBreakdown}
				criterionAverages={data.criterionAverages}
				isAnonymized={data.isAnonymized}
				ratingScaleMax={data.ratingScaleMax}
			/>

			<TeamObservationsSection
				groupName={data.participant.groupName}
				teamObservations={data.teamObservations}
			/>
		</div>
	);
}

function TaskScoresCard({
	taskScores,
}: {
	taskScores: EvaluationParticipantDetailData["taskScores"];
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ListChecks className="h-5 w-5" />
					Teil-Scores je Aufgabe
				</CardTitle>
				<CardDescription>
					Der Gesamtwert ist der nach Teil-Gewicht gewichtete Mittelwert der
					Teil-Scores.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{taskScores.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Diese Bewerbende ist noch keiner Aufgabe zugeordnet.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Aufgabe</TableHead>
								<TableHead className="text-right">Teil-Gewicht</TableHead>
								<TableHead className="text-right">Teil-Score</TableHead>
								<TableHead className="text-right">Spanne</TableHead>
								<TableHead className="text-right">Bewertungen</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{taskScores.map((task) => (
								<TableRow key={task.taskId}>
									<TableCell className="font-medium">
										<div className="flex flex-wrap items-center gap-2">
											{task.taskName}
											{task.hasStrongDeviation && <DeviationBadge />}
										</div>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{task.scoreWeight.toLocaleString("de-DE")}
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										<span
											className={
												task.score === null
													? "text-muted-foreground"
													: undefined
											}
										>
											{formatPercent(task.score)}
										</span>
									</TableCell>
									<TableCell className="text-right text-muted-foreground tabular-nums">
										{formatSpread(task.reviewerSpread)}
									</TableCell>
									<TableCell className="text-right text-muted-foreground tabular-nums">
										{task.completedAssignments} / {task.totalAssignments}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

type TeamObservationsSectionProps = {
	groupName: string | null;
	teamObservations: EvaluationParticipantDetailData["teamObservations"];
};

function TeamObservationsSection({
	groupName,
	teamObservations,
}: TeamObservationsSectionProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Gruppenbeobachtungen
				</CardTitle>
				<CardDescription>
					Gesamt-Reviews der Bewerter zu Teamaufgaben der Gruppe
					{groupName ? ` „${groupName}"` : ""}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{teamObservations.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{groupName
							? "Für diese Gruppe wurden noch keine Gesamt-Reviews zu Teamaufgaben erfasst."
							: "Diese Bewerbende ist keiner Gruppe zugeordnet, daher liegen keine Gruppenbeobachtungen vor."}
					</p>
				) : (
					<div className="space-y-5">
						{teamObservations.map((task, index) => (
							<div className="space-y-3" key={task.taskId}>
								{index > 0 && <Separator />}
								<div>
									<p className="font-medium text-sm">{task.taskName}</p>
									<p className="text-muted-foreground text-xs">
										{task.entries.length}{" "}
										{task.entries.length === 1
											? "Beobachtung"
											: "Beobachtungen"}
									</p>
								</div>
								<ul className="space-y-3">
									{task.entries.map((entry) => (
										<li
											className="rounded-lg border bg-muted/30 p-3"
											key={`${task.taskId}-${entry.reviewerName}-${entry.updatedAt.toString()}`}
										>
											<p className="text-muted-foreground text-xs">
												{entry.reviewerName}
											</p>
											<p className="mt-1 whitespace-pre-wrap text-sm">
												{entry.notes}
											</p>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export { EvaluationParticipantDetail };
