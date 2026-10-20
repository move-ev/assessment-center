import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type { EvaluationCalibration as CalibrationData } from "../server/get-evaluation-results-data";

/** Fewer shared ratings than this make a reviewer's tendency shaky. */
const FEW_COMPARISONS = 3;
/** Deviation the diverging bar spans to either side, in percentage points. */
const BAR_RANGE_POINTS = 20;

function formatSigned(value: number, unit: string): string {
	const formatted = Math.abs(value).toLocaleString("de-DE", {
		maximumFractionDigits: 1,
	});
	const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
	return `${sign}${formatted} ${unit}`;
}

function describeTendency(deviation: number): string {
	if (Math.abs(deviation) < 1) {
		return "im Schnitt der anderen";
	}
	return deviation > 0 ? "milder als die anderen" : "strenger als die anderen";
}

/** Diverging bar from the middle: blue to the right (milder), red left. */
function DeviationBar({ deviation }: { deviation: number }) {
	const share =
		(Math.min(Math.abs(deviation), BAR_RANGE_POINTS) / BAR_RANGE_POINTS) * 50;

	return (
		<div aria-hidden className="relative h-3 w-40 rounded-sm bg-muted/40">
			<span className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
			<span
				className="absolute inset-y-0.5 rounded-sm"
				style={{
					width: `${share}%`,
					left: deviation >= 0 ? "50%" : `${50 - share}%`,
					backgroundColor: deviation >= 0 ? "var(--series-1)" : "#e34948",
				}}
			/>
		</div>
	);
}

function ReviewerLeniencyCard({
	reviewers,
	taskNames,
}: {
	reviewers: CalibrationData["reviewers"];
	taskNames: Map<string, string>;
}) {
	return (
		<Card data-testid="reviewer-leniency">
			<CardHeader>
				<CardTitle>Strenge und Milde je Bewerter</CardTitle>
				<CardDescription>
					Prozentpunkte über (+) oder unter (−) dem Mittel der anderen Bewerter,
					die dieselbe Bewerbende in derselben Aufgabe bewertet haben.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Bewerter</TableHead>
							<TableHead>Tendenz</TableHead>
							<TableHead className="text-right">Abweichung</TableHead>
							<TableHead className="text-right">Vergleiche</TableHead>
							<TableHead>Je Aufgabe</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{reviewers.map((reviewer) => (
							<TableRow key={reviewer.reviewerId}>
								<TableCell className="font-medium">
									{reviewer.reviewerName}
								</TableCell>
								<TableCell>
									{reviewer.meanDeviation === null ? (
										<span className="text-muted-foreground text-sm">
											Keine gemeinsamen Bewertungen
										</span>
									) : (
										<div className="flex items-center gap-3">
											<DeviationBar deviation={reviewer.meanDeviation} />
											<span className="text-muted-foreground text-sm">
												{describeTendency(reviewer.meanDeviation)}
											</span>
										</div>
									)}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{reviewer.meanDeviation === null
										? "–"
										: formatSigned(reviewer.meanDeviation, "Pkt.")}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									<span
										className={
											reviewer.comparisonCount < FEW_COMPARISONS
												? "text-muted-foreground"
												: undefined
										}
										title={
											reviewer.comparisonCount < FEW_COMPARISONS
												? "Wenige Vergleiche – Tendenz unsicher"
												: undefined
										}
									>
										{reviewer.comparisonCount}
									</span>
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{reviewer.tasks
										.flatMap((task) =>
											task.meanDeviation === null
												? []
												: [
														`${taskNames.get(task.taskId) ?? "Aufgabe"} ${formatSigned(task.meanDeviation, "")}`.trim(),
													],
										)
										.join(" · ") || "–"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function CriterionDisagreementCard({
	criteria,
	maxSpread,
}: {
	criteria: CalibrationData["criteria"];
	maxSpread: number;
}) {
	return (
		<Card data-testid="criterion-disagreement">
			<CardHeader>
				<CardTitle>Uneinigkeit je Kriterium</CardTitle>
				<CardDescription>
					Mittlere Spanne in Sternen zwischen den Bewertern derselben
					Bewerbenden. Hohe Werte deuten auf Ankertexte hin, die unterschiedlich
					verstanden werden.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{criteria.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Noch keine Kriterien mit mehreren Bewertern.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Aufgabe</TableHead>
								<TableHead>Kriterium</TableHead>
								<TableHead>Ø Spanne</TableHead>
								<TableHead className="text-right">Vergleiche</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{criteria.map((criterion) => (
								<TableRow key={criterion.criteriaId}>
									<TableCell className="text-muted-foreground">
										{criterion.taskName}
									</TableCell>
									<TableCell>
										<p className="font-medium">{criterion.name}</p>
										<p className="text-muted-foreground text-xs">
											{criterion.criteriaGroupTitle}
										</p>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-3">
											<div
												aria-hidden
												className="h-3 w-32 rounded-sm bg-muted/40"
											>
												<span
													className="block h-full rounded-sm"
													style={{
														width: `${Math.min(100, (criterion.meanSpread / maxSpread) * 100)}%`,
														backgroundColor: "var(--series-1)",
													}}
												/>
											</div>
											<span className="tabular-nums">
												{criterion.meanSpread.toLocaleString("de-DE", {
													maximumFractionDigits: 2,
												})}{" "}
												Sterne
											</span>
										</div>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{criterion.comparisonCount}
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

/**
 * Calibration aid for the AC team, not an assessment of reviewers: only
 * ratings of the same participant in the same task are compared.
 */
function EvaluationCalibration({
	calibration,
	tasks,
	ratingScaleMax,
}: {
	calibration: CalibrationData;
	tasks: Array<{ id: string; name: string }>;
	ratingScaleMax: number;
}) {
	return (
		<div className="space-y-4">
			<Alert>
				<InfoIcon />
				<AlertTitle>Hilfsmittel zur Kalibrierung</AlertTitle>
				<AlertDescription>
					Die Werte zeigen Tendenzen für Abstimmung und Schulung, keine
					Bewertung der Bewerter. Bei wenigen Vergleichen sind sie unsicher.
				</AlertDescription>
			</Alert>
			<ReviewerLeniencyCard
				reviewers={calibration.reviewers}
				taskNames={new Map(tasks.map((task) => [task.id, task.name]))}
			/>
			<CriterionDisagreementCard
				criteria={calibration.criteria}
				maxSpread={ratingScaleMax - 1}
			/>
		</div>
	);
}

export { EvaluationCalibration };
