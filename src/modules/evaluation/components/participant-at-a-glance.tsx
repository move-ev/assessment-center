import { CheckIcon, XIcon } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatPercent } from "@/lib/format-percent";
import { cn } from "@/lib/utils";
import {
	type MeanComparison,
	pickStrengthsAndWeaknesses,
	STRONG_DEVIATION_POINTS,
} from "../server/comparison";
import type {
	EvaluationParticipantDetailData,
	ScoreComparison,
} from "../server/get-evaluation-participant-detail-data";
import { formatDelta, TONE, ToneBadge, ToneLegend } from "./mean-tone";

type Row = {
	key: string;
	label: string;
	score: number | null;
	comparison: ScoreComparison;
	isOverall?: boolean;
};

type ComparedRow = Row & { vsMean: MeanComparison };

function withComparison(rows: Row[]): ComparedRow[] {
	return rows.flatMap((row) =>
		row.comparison.vsMean ? [{ ...row, vsMean: row.comparison.vsMean }] : [],
	);
}

/** One sentence naming the clearest strength and weakness among the tasks. */
function describeHeadline(tasks: ComparedRow[]): string {
	const { strengths, weaknesses } = pickStrengthsAndWeaknesses(
		tasks.map((task) => ({ ...task, delta: task.vsMean.delta })),
		1,
	);
	const [strength] = strengths;
	const [weakness] = weaknesses;
	const parts = [
		strength
			? `Stärkste Aufgabe: ${strength.label} (${formatDelta(strength.delta)} über Ø)`
			: null,
		weakness
			? `schwächste: ${weakness.label} (${formatDelta(weakness.delta)} unter Ø)`
			: null,
	].filter(Boolean);

	if (parts.length === 0) {
		return "In allen Aufgaben im Schnitt des AC.";
	}
	const sentence = parts.join(", ");
	return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function ScoreTile({
	row,
	expectationPercent,
}: {
	row: Row;
	expectationPercent: number;
}) {
	const { vsMean, summary, position } = row.comparison;
	const meetsExpectation =
		row.score !== null &&
		Math.round(row.score) >= Math.round(expectationPercent);

	return (
		<li
			className={cn(
				"flex flex-col gap-2 rounded-xl border p-4",
				row.isOverall && "border-foreground/30 bg-muted/30",
			)}
			data-testid="score-tile"
		>
			<div className="flex items-start justify-between gap-2">
				<p className={cn("text-sm", row.isOverall && "font-semibold")}>
					{row.label}
				</p>
				{vsMean && (
					<span className="font-medium text-muted-foreground text-xs">
						{TONE[vsMean.tone].verdict}
					</span>
				)}
			</div>
			<p className="font-semibold text-3xl tabular-nums">
				{formatPercent(row.score)}
			</p>
			{vsMean ? (
				<ToneBadge className="self-start" comparison={vsMean} />
			) : (
				<span className="text-muted-foreground text-xs">Kein Vergleich</span>
			)}
			<div className="space-y-0.5 text-muted-foreground text-xs">
				{summary && (
					<p>
						Ø AC {formatPercent(summary.mean)}
						{position !== null && ` · Platz ${position} von ${summary.count}`}
					</p>
				)}
				{row.score !== null && (
					<p className="inline-flex items-center gap-1">
						{meetsExpectation ? (
							<CheckIcon aria-hidden className="size-3" />
						) : (
							<XIcon aria-hidden className="size-3" />
						)}
						Erwartung ({formatPercent(expectationPercent)}){" "}
						{meetsExpectation ? "erfüllt" : "nicht erfüllt"}
					</p>
				)}
			</div>
		</li>
	);
}

/** Room left at each end of a deviation bar for its label, as a share. */
const LABEL_HEADROOM = 1.35;

/**
 * Bars from the AC mean: right and green is better, left and red is worse.
 * The scale grows with the largest gap, but never below the "strong" mark,
 * so small differences don't look dramatic.
 */
function DeviationChart({ rows }: { rows: ComparedRow[] }) {
	const range =
		Math.max(
			STRONG_DEVIATION_POINTS,
			...rows.map((row) => Math.abs(row.vsMean.delta)),
		) * LABEL_HEADROOM;

	return (
		<div className="space-y-2" data-testid="deviation-chart">
			<div className="grid grid-cols-[minmax(7rem,11rem)_1fr] gap-4 text-muted-foreground text-xs">
				<span />
				<div className="flex justify-between">
					<span>◀ schlechter als Ø</span>
					<span>Ø AC</span>
					<span>besser als Ø ▶</span>
				</div>
			</div>
			<ul className="space-y-2">
				{rows.map((row) => {
					const share = (Math.abs(row.vsMean.delta) / range) * 50;
					const above = row.vsMean.delta >= 0;
					return (
						<li
							className="grid grid-cols-[minmax(7rem,11rem)_1fr] items-center gap-4"
							key={row.key}
						>
							<span
								className={cn(
									"truncate text-sm",
									row.isOverall && "font-semibold",
								)}
							>
								{row.label}
							</span>
							<div
								aria-label={`${row.label}: ${formatDelta(row.vsMean.delta)} gegenüber dem Durchschnitt, ${TONE[row.vsMean.tone].label}`}
								className="relative h-7 rounded-md bg-muted/30"
								role="img"
							>
								<span className="absolute inset-y-0 left-1/2 w-px bg-foreground/50" />
								<span
									className="absolute inset-y-1 rounded-sm"
									style={{
										left: above ? "50%" : `${50 - share}%`,
										width: `max(${share}%, 2px)`,
										backgroundColor: TONE[row.vsMean.tone].barColor,
									}}
								/>
								<span
									className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 font-medium text-xs tabular-nums"
									style={
										above
											? { left: `${50 + share}%` }
											: { right: `${50 + share}%` }
									}
								>
									{formatDelta(row.vsMean.delta)}
								</span>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

/**
 * The first look at a participant: where they were better or worse than
 * the AC, as one sentence, one tile per task and bars from the mean.
 */
function ParticipantAtAGlance({
	participant,
	taskScores,
	expectationPercent,
}: {
	participant: EvaluationParticipantDetailData["participant"];
	taskScores: EvaluationParticipantDetailData["taskScores"];
	expectationPercent: number;
}) {
	if (taskScores.length === 0) {
		return null;
	}

	const taskRows: Row[] = taskScores.map((task) => ({
		key: task.taskId,
		label: task.taskName,
		score: task.score,
		comparison: task.comparison,
	}));
	const overallRow: Row = {
		key: "overall",
		label: "Gesamtwert",
		score: participant.overallScore,
		comparison: participant.overallComparison,
		isOverall: true,
	};
	const comparedTasks = withComparison(taskRows);

	return (
		<Card data-testid="at-a-glance">
			<CardHeader>
				<CardTitle>Auf einen Blick</CardTitle>
				<CardDescription data-testid="headline">
					{describeHeadline(comparedTasks)}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[...taskRows, overallRow].map((row) => (
						<ScoreTile
							expectationPercent={expectationPercent}
							key={row.key}
							row={row}
						/>
					))}
				</ul>
				{comparedTasks.length > 0 && (
					<DeviationChart rows={withComparison([...taskRows, overallRow])} />
				)}
				<ToneLegend />
			</CardContent>
		</Card>
	);
}

export { ParticipantAtAGlance };
