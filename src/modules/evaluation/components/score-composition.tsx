import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatPercent } from "@/lib/format-percent";
import { ROUTES } from "@/lib/routes";
import type { TaskContribution } from "../server/comparison";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";
import { axisPosition, LegendItem, seriesColor } from "./score-strip";

type TaskInfo = { id: string; name: string };

const INCOMPLETE_NOTE =
	"Nicht alle Aufgaben haben einen Wert; der Gesamtwert stützt sich nur auf die übrigen.";

function formatPoints(value: number): string {
	return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Pkt.`;
}

/**
 * One bar per overall score, split into the weighted share of each task, so
 * one sees whether a score rests on all tasks or on one strong task.
 */
function CompositionBar({
	contributions,
	tasks,
	label,
}: {
	contributions: TaskContribution[];
	tasks: TaskInfo[];
	label: string;
}) {
	return (
		<div
			aria-label={label}
			className="flex h-4 w-full overflow-hidden rounded-sm bg-muted/40"
			role="img"
		>
			{contributions.map((entry) => {
				const taskIndex = tasks.findIndex((task) => task.id === entry.taskId);
				return (
					<span
						className="h-full border-card border-r-2 last:border-r-0"
						key={entry.taskId}
						style={{
							width: axisPosition(entry.contribution),
							backgroundColor: seriesColor(taskIndex),
						}}
						title={`${tasks[taskIndex]?.name ?? "Aufgabe"}: ${formatPoints(entry.contribution)}`}
					/>
				);
			})}
		</div>
	);
}

function TaskLegend({ tasks }: { tasks: TaskInfo[] }) {
	return (
		<div className="flex flex-wrap gap-4">
			{tasks.map((task, index) => (
				<LegendItem
					color={seriesColor(index)}
					key={task.id}
					label={task.name}
					shape="band"
				/>
			))}
		</div>
	);
}

function describeComposition(
	contributions: TaskContribution[],
	tasks: TaskInfo[],
): string {
	return contributions
		.map(
			(entry) =>
				`${tasks.find((task) => task.id === entry.taskId)?.name ?? "Aufgabe"} ${formatPoints(entry.contribution)}`,
		)
		.join(", ");
}

function ScoreComposition({
	acId,
	participants,
	tasks,
}: {
	acId: string;
	participants: EvaluationResultsData["participants"];
	tasks: TaskInfo[];
}) {
	const scored = participants.filter(
		(participant) => participant.overallScore !== null,
	);

	if (scored.length === 0) {
		return null;
	}

	return (
		<Card data-testid="score-composition">
			<CardHeader>
				<CardTitle>Zusammensetzung der Gesamtwerte</CardTitle>
				<CardDescription>
					Jede Aufgabe trägt ihren Teil-Score anteilig nach Teil-Gewicht bei;
					die Abschnitte ergeben zusammen den Gesamtwert.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<TaskLegend tasks={tasks} />
				{scored.some(
					(participant) => participant.taskContributions.length < tasks.length,
				) && (
					<p className="text-muted-foreground text-xs">* {INCOMPLETE_NOTE}</p>
				)}
				<ul className="space-y-2">
					{scored.map((participant) => (
						<li
							className="grid grid-cols-[minmax(8rem,12rem)_1fr_3.5rem] items-center gap-3 text-sm"
							key={participant.id}
						>
							<Link
								className="truncate underline-offset-4 hover:underline"
								href={ROUTES.acResultsParticipant(acId, participant.id)}
							>
								{participant.name}
							</Link>
							<CompositionBar
								contributions={participant.taskContributions}
								label={`${participant.name}: ${describeComposition(participant.taskContributions, tasks)}`}
								tasks={tasks}
							/>
							<span
								className="text-right tabular-nums"
								title={
									participant.taskContributions.length < tasks.length
										? INCOMPLETE_NOTE
										: undefined
								}
							>
								{formatPercent(participant.overallScore)}
								{participant.taskContributions.length < tasks.length && "*"}
							</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

export { CompositionBar, describeComposition, ScoreComposition, TaskLegend };
