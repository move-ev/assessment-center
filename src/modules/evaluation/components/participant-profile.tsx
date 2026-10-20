import { ChartNoAxesColumn } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatOverallScore, formatPercent } from "@/lib/format-percent";
import type {
	EvaluationParticipantDetailData,
	ScoreComparison,
} from "../server/get-evaluation-participant-detail-data";
import {
	CompositionBar,
	describeComposition,
	TaskLegend,
} from "./score-composition";
import {
	axisPosition,
	LegendItem,
	StripAxis,
	StripDot,
	StripTick,
	StripTrack,
	TICK_COLOR,
} from "./score-strip";

const RANGE_COLOR = "color-mix(in oklab, var(--series-1) 18%, transparent)";
const PERSON_COLOR = "var(--series-1)";

function describePosition(comparison: ScoreComparison): string {
	if (comparison.position === null || !comparison.summary) {
		return "kein Wert";
	}
	return `Platz ${comparison.position} von ${comparison.summary.count}`;
}

function ProfileRow({
	label,
	score,
	comparison,
	emphasis = false,
	showsDecimal = false,
}: {
	label: string;
	score: number | null;
	comparison: ScoreComparison;
	emphasis?: boolean;
	/** Overall score whose exact value decided the rank (Sonderfall 2). */
	showsDecimal?: boolean;
}) {
	const { summary } = comparison;
	const shownScore = formatOverallScore(score, showsDecimal);
	const description = [
		`${label}: ${shownScore}`,
		describePosition(comparison),
		summary
			? `AC von ${formatPercent(summary.min)} bis ${formatPercent(summary.max)}, Durchschnitt ${formatPercent(summary.mean)}`
			: null,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<li className="grid grid-cols-[minmax(7rem,11rem)_1fr_4rem] items-center gap-4">
			<div>
				<p
					className={emphasis ? "font-semibold text-sm" : "font-medium text-sm"}
				>
					{label}
				</p>
				<p className="text-muted-foreground text-xs">
					{describePosition(comparison)}
				</p>
			</div>
			<StripTrack label={description}>
				{summary && (
					<>
						<span
							className="absolute inset-y-1.5 rounded-sm"
							style={{
								left: axisPosition(summary.min),
								width: axisPosition(summary.max - summary.min),
								backgroundColor: RANGE_COLOR,
							}}
							title={`Spanne im AC: ${formatPercent(summary.min)} bis ${formatPercent(summary.max)}`}
						/>
						<StripTick
							score={summary.mean}
							title={`Durchschnitt im AC: ${formatPercent(summary.mean)}`}
						/>
					</>
				)}
				{score !== null && (
					<StripDot
						className="size-3.5"
						color={PERSON_COLOR}
						score={score}
						title={`${label}: ${shownScore}`}
					/>
				)}
			</StripTrack>
			<p
				className={
					emphasis
						? "text-right font-semibold tabular-nums"
						: "text-right tabular-nums"
				}
			>
				{shownScore}
			</p>
		</li>
	);
}

/**
 * The participant against the whole AC: per task and overall, their score
 * next to the AC's range and mean, and how the overall score is made up.
 */
function ParticipantProfile({
	participant,
	taskScores,
}: {
	participant: EvaluationParticipantDetailData["participant"];
	taskScores: EvaluationParticipantDetailData["taskScores"];
}) {
	if (taskScores.length === 0) {
		return null;
	}

	const tasks = taskScores.map((task) => ({
		id: task.taskId,
		name: task.taskName,
	}));

	return (
		<Card data-testid="participant-profile">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ChartNoAxesColumn className="h-5 w-5" />
					Profil im Vergleich zum AC
				</CardTitle>
				<CardDescription>
					Je Aufgabe zählt der Platz höhere Werte im AC, gleiche Werte teilen
					sich einen Platz. Beim Gesamtwert gilt der Rang aus der Rangliste.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<ul className="space-y-3">
					{taskScores.map((task) => (
						<ProfileRow
							comparison={task.comparison}
							key={task.taskId}
							label={task.taskName}
							score={task.score}
						/>
					))}
					<ProfileRow
						comparison={participant.overallComparison}
						emphasis
						label="Gesamtwert"
						score={participant.overallScore}
						showsDecimal={participant.showsDecimal}
					/>
				</ul>
				<div className="grid grid-cols-[minmax(7rem,11rem)_1fr_4rem] gap-4">
					<span />
					<StripAxis />
				</div>
				<div className="flex flex-wrap gap-4">
					<LegendItem color={PERSON_COLOR} label={participant.name} />
					<LegendItem color={RANGE_COLOR} label="Spanne im AC" shape="band" />
					<LegendItem
						color={TICK_COLOR}
						label="Durchschnitt im AC"
						shape="tick"
					/>
				</div>

				{participant.taskContributions.length > 0 && (
					<div className="space-y-2 border-t pt-4">
						<p className="font-medium text-sm">
							Zusammensetzung des Gesamtwerts
						</p>
						<CompositionBar
							contributions={participant.taskContributions}
							label={describeComposition(participant.taskContributions, tasks)}
							tasks={tasks}
						/>
						<p className="text-muted-foreground text-xs">
							{describeComposition(participant.taskContributions, tasks)}
						</p>
						<TaskLegend tasks={tasks} />
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export { ParticipantProfile };
