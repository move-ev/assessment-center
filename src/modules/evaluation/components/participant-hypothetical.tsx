import { Scale } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	formatOverallScore,
	formatPercent,
	formatSignedPoints,
} from "@/lib/format-percent";
import { cn } from "@/lib/utils";
import type {
	EvaluationParticipantDetailData,
	ParticipantHypothetical as HypotheticalData,
} from "../server/get-evaluation-participant-detail-data";

function ScenarioTile({
	label,
	detail,
	score,
	rank,
	rankedCount,
	actual = false,
}: {
	label: string;
	detail?: string;
	score: string;
	rank: number | null;
	rankedCount: number;
	actual?: boolean;
}) {
	return (
		<div
			className={cn(
				"space-y-1 rounded-lg border p-3",
				actual ? "border-foreground/30" : "bg-muted/30 text-muted-foreground",
			)}
		>
			<p className="text-xs">{label}</p>
			{detail && <p className="text-xs">{detail}</p>}
			<p
				className={cn(
					"tabular-nums",
					actual ? "font-bold text-2xl" : "font-medium text-lg",
				)}
			>
				{score}
			</p>
			<p className="text-xs">
				{rank === null ? "–" : `Rang ${rank} von ${rankedCount}`}
			</p>
		</div>
	);
}

/**
 * What the person's result would have been had one reviewer rated
 * everyone, below all real ratings. Explains a gap by the reviewers who
 * actually rated: the real task score minus the average reviewer's is
 * their mean effect.
 */
function ParticipantHypothetical({
	data,
	participant,
}: {
	data: HypotheticalData;
	participant: EvaluationParticipantDetailData["participant"];
}) {
	if (!data || participant.overallScore === null) {
		return null;
	}
	const { strictest, mildest } = data;

	return (
		<Card data-testid="participant-hypothetical">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Scale className="h-5 w-5" />
					Einordnung
				</CardTitle>
				<CardDescription>
					Maßgeblich ist das tatsächliche Ergebnis. Zur Einordnung: welchen
					Gesamtwert und Rang die Person hypothetisch erhalten hätte, wenn ein
					einziger Bewerter alle bewertet hätte. Der Versatz je Bewerter ist
					über das ganze AC geschätzt und bei wenigen Vergleichen gedämpft
					(Details im Tab „Kalibrierung“).
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<ScenarioTile
						actual
						label="Tatsächlich"
						rank={participant.rank}
						rankedCount={participant.rankedCount}
						score={formatOverallScore(
							participant.overallScore,
							participant.showsDecimal,
						)}
					/>
					<ScenarioTile
						detail={
							strictest
								? `${strictest.reviewerName} (${formatSignedPoints(strictest.effect)})`
								: undefined
						}
						label="Kritischster Bewerter"
						rank={strictest?.rank ?? null}
						rankedCount={participant.rankedCount}
						score={formatPercent(strictest?.score ?? null)}
					/>
					<ScenarioTile
						detail="Versatz ±0 Pkt."
						label="Ø-Bewerter"
						rank={data.averageReviewer.rank}
						rankedCount={participant.rankedCount}
						score={formatPercent(data.averageReviewer.score)}
					/>
					<ScenarioTile
						detail={
							mildest
								? `${mildest.reviewerName} (${formatSignedPoints(mildest.effect)})`
								: undefined
						}
						label="Mildester Bewerter"
						rank={mildest?.rank ?? null}
						rankedCount={participant.rankedCount}
						score={formatPercent(mildest?.score ?? null)}
					/>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Aufgabe</TableHead>
							<TableHead className="text-right">Teil-Score</TableHead>
							<TableHead className="text-right text-muted-foreground">
								Ø-Bewerter
							</TableHead>
							<TableHead className="text-muted-foreground">
								Bewertet von (Versatz)
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.tasks.map((task) => (
							<TableRow key={task.taskId}>
								<TableCell className="font-medium">{task.taskName}</TableCell>
								<TableCell className="text-right font-mono font-semibold tabular-nums">
									{formatPercent(task.actualScore)}
								</TableCell>
								<TableCell className="text-right font-mono text-muted-foreground tabular-nums">
									{formatPercent(task.averageReviewerScore)}
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{task.reviewers
										.map(
											(reviewer) =>
												`${reviewer.reviewerName} (${
													reviewer.effect === null
														? "kein Vergleich"
														: formatSignedPoints(reviewer.effect)
												})`,
										)
										.join(" · ")}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

export { ParticipantHypothetical };
