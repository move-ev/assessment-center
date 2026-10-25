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
import { formatSignedPoints } from "@/lib/format-percent";
import type { RatingScaleMax } from "@/lib/rating-scale";
import { cn } from "@/lib/utils";
import type { EvaluationCalibration as CalibrationData } from "../server/get-evaluation-results-data";
import { HypotheticalResults } from "./hypothetical-results";

/** Fewer shared ratings than this make a reviewer's tendency shaky. */
const FEW_COMPARISONS = 3;
/** Deviation the diverging bar spans to either side, in percentage points. */
const BAR_RANGE_POINTS = 20;

function describeTendency(deviation: number): string {
	if (Math.abs(deviation) < 1) {
		return "im Schnitt der anderen";
	}
	return deviation > 0 ? "milder als die anderen" : "strenger als die anderen";
}

function isUncertain(comparisonCount: number): boolean {
	return comparisonCount < FEW_COMPARISONS;
}

/** Diverging bar from the middle: blue to the right (milder), red left. */
function DeviationBar({
	deviation,
	uncertain,
}: {
	deviation: number;
	uncertain: boolean;
}) {
	const share =
		(Math.min(Math.abs(deviation), BAR_RANGE_POINTS) / BAR_RANGE_POINTS) * 50;

	return (
		<div
			aria-hidden
			className={cn(
				"relative h-3 w-40 rounded-sm bg-muted/40",
				uncertain && "opacity-40",
			)}
		>
			<span className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
			<span
				className="absolute inset-y-0.5 rounded-sm"
				style={{
					width: `${share}%`,
					left: deviation >= 0 ? "50%" : `${50 - share}%`,
					backgroundColor:
						deviation >= 0 ? "var(--series-1)" : "var(--series-8)",
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
											<DeviationBar
												deviation={reviewer.meanDeviation}
												uncertain={isUncertain(reviewer.comparisonCount)}
											/>
											<span className="text-muted-foreground text-sm">
												{describeTendency(reviewer.meanDeviation)}
												{isUncertain(reviewer.comparisonCount) &&
													" (unsicher, wenige Vergleiche)"}
											</span>
										</div>
									)}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{reviewer.meanDeviation === null
										? "–"
										: formatSignedPoints(reviewer.meanDeviation)}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{reviewer.comparisonCount}
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{reviewer.tasks
										.flatMap((task) =>
											task.meanDeviation === null
												? []
												: [
														`${taskNames.get(task.taskId) ?? "Aufgabe"} ${formatSignedPoints(task.meanDeviation)} (${task.comparisonCount}×)`,
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
	maxDistance,
}: {
	criteria: CalibrationData["criteria"];
	maxDistance: number;
}) {
	return (
		<Card data-testid="criterion-disagreement">
			<CardHeader>
				<CardTitle>Uneinigkeit je Kriterium</CardTitle>
				<CardDescription>
					Mittlerer Abstand in Sternen zwischen zwei Bewertern derselben
					Bewerbenden. Hohe Werte deuten auf Ankertexte hin, die unterschiedlich
					verstanden werden. Unter {FEW_COMPARISONS} Vergleichen ist der Wert
					blass dargestellt.
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
								<TableHead>Ø Abstand</TableHead>
								<TableHead className="text-right">Vergleiche</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{criteria.map((criterion) => (
								<TableRow
									className={cn(
										isUncertain(criterion.comparisonCount) && "opacity-60",
									)}
									key={criterion.criteriaId}
								>
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
														width: `${Math.min(100, (criterion.meanDistance / maxDistance) * 100)}%`,
														backgroundColor: "var(--series-1)",
													}}
												/>
											</div>
											<span className="tabular-nums">
												{criterion.meanDistance.toLocaleString("de-DE", {
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
	acId,
	calibration,
	tasks,
	ratingScaleMax,
}: {
	acId: string;
	calibration: CalibrationData;
	tasks: Array<{ id: string; name: string }>;
	ratingScaleMax: RatingScaleMax;
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
			<HypotheticalResults acId={acId} data={calibration.hypothetical} />
			<CriterionDisagreementCard
				criteria={calibration.criteria}
				maxDistance={ratingScaleMax - 1}
			/>
		</div>
	);
}

export { EvaluationCalibration };
