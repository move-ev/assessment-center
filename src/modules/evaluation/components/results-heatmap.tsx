import { TriangleAlertIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";
import { getHeatStep, HEAT_STEP_BOUNDS } from "./chart-scales";

type Participants = EvaluationResultsData["participants"];
type Tasks = EvaluationResultsData["tasks"];

const HEAT_CELL = [
	"bg-heat-0 text-heat-0-foreground",
	"bg-heat-1 text-heat-1-foreground",
	"bg-heat-2 text-heat-2-foreground",
	"bg-heat-3 text-heat-3-foreground",
	"bg-heat-4 text-heat-4-foreground",
] as const;

function heatLegendLabels(): string[] {
	const [first, ...rest] = HEAT_STEP_BOUNDS;
	return [
		`< ${first} %`,
		...HEAT_STEP_BOUNDS.map((bound, index) => {
			const next = rest[index];
			return next === undefined ? `≥ ${bound} %` : `${bound}–${next - 1} %`;
		}),
	];
}

function HeatCell({
	score,
	hasStrongDeviation = false,
	label,
}: {
	score: number | null;
	hasStrongDeviation?: boolean;
	label: string;
}) {
	const step = getHeatStep(score);

	return (
		<td className="p-0.5">
			<div
				className={cn(
					"flex h-9 min-w-16 items-center justify-center gap-1 rounded-md text-sm tabular-nums",
					step === null ? "bg-muted/40 text-muted-foreground" : HEAT_CELL[step],
				)}
				title={`${label}: ${formatPercent(score)}${
					hasStrongDeviation ? " · Beobachter weichen stark ab" : ""
				}`}
			>
				{formatPercent(score)}
				{hasStrongDeviation && (
					<TriangleAlertIcon
						aria-label="starke Abweichung"
						className="size-3.5"
					/>
				)}
			</div>
		</td>
	);
}

/**
 * Participants × tasks, coloured by score: strengths and weaknesses across
 * the AC at a glance. Rows in ranking order, columns as in the task tab.
 */
function ResultsHeatmap({
	acId,
	participants,
	tasks,
}: {
	acId: string;
	participants: Participants;
	tasks: Tasks;
}) {
	return (
		<Card data-testid="results-heatmap">
			<CardHeader>
				<CardTitle>Heatmap Bewerbende × Aufgaben</CardTitle>
				<CardDescription>
					Teil-Scores je Aufgabe in festen Farbstufen, damit gleiche Farbe in
					jedem AC denselben Wert bedeutet.{" "}
					<TriangleAlertIcon className="inline size-3.5" /> markiert eine starke
					Abweichung zwischen Beobachtern.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="overflow-x-auto">
					<table className="w-full border-separate border-spacing-0 text-sm">
						<thead>
							<tr>
								<th className="px-2 py-1 text-left font-medium text-muted-foreground">
									Bewerbende
								</th>
								{tasks.map((task) => (
									<th
										className="px-2 py-1 text-center font-medium text-muted-foreground"
										key={task.id}
									>
										{task.name}
									</th>
								))}
								<th className="px-2 py-1 text-center font-medium">Gesamt</th>
							</tr>
						</thead>
						<tbody>
							{participants.map((participant, index) => (
								<tr key={participant.id}>
									<td className="whitespace-nowrap px-2 py-0.5">
										<span className="mr-2 text-muted-foreground tabular-nums">
											{index + 1}.
										</span>
										<Link
											className="underline-offset-4 hover:underline"
											href={ROUTES.acResultsParticipant(acId, participant.id)}
										>
											{participant.name}
										</Link>
									</td>
									{tasks.map((task) => {
										const result = participant.taskResults.find(
											(entry) => entry.taskId === task.id,
										);
										return (
											<HeatCell
												hasStrongDeviation={result?.hasStrongDeviation}
												key={task.id}
												label={`${participant.name}, ${task.name}`}
												score={result?.score ?? null}
											/>
										);
									})}
									<HeatCell
										label={`${participant.name}, Gesamtwert`}
										score={participant.overallScore}
									/>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
					{heatLegendLabels().map((label, step) => (
						<span className="inline-flex items-center gap-1.5" key={label}>
							<span
								aria-hidden
								className={cn("h-3 w-5 rounded-sm", HEAT_CELL[step])}
							/>
							{label}
						</span>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export { ResultsHeatmap };
