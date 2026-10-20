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
import { compareToMean } from "../server/comparison";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";
import { formatDelta, TONE, ToneLegend } from "./mean-tone";

type Participants = EvaluationResultsData["participants"];
type Tasks = EvaluationResultsData["tasks"];

function HeatCell({
	score,
	mean,
	hasStrongDeviation = false,
	label,
}: {
	score: number | null;
	mean: number | null;
	hasStrongDeviation?: boolean;
	label: string;
}) {
	const comparison = compareToMean(score, mean);
	const tone = comparison ? TONE[comparison.tone] : null;

	return (
		<td className="p-0.5">
			<div
				className={cn(
					"flex h-9 min-w-20 items-center justify-center gap-1 rounded-md text-sm tabular-nums",
					tone ? tone.className : "bg-muted/40 text-muted-foreground",
				)}
				title={[
					`${label}: ${formatPercent(score)}`,
					comparison
						? `${formatDelta(comparison.delta)} gegenüber Ø ${formatPercent(mean)} (${tone?.label})`
						: null,
					hasStrongDeviation ? "Beobachter weichen stark ab" : null,
				]
					.filter(Boolean)
					.join(" · ")}
			>
				{tone && <tone.Icon aria-hidden className="size-3.5" />}
				{formatPercent(score)}
				{hasStrongDeviation && (
					<TriangleAlertIcon
						aria-label="starke Abweichung"
						className="size-3.5 opacity-70"
					/>
				)}
			</div>
		</td>
	);
}

/**
 * Participants × tasks, coloured by how far each score lies above (green)
 * or below (red) the task's mean: strengths and weaknesses across the AC
 * at a glance. Rows in ranking order, columns as in the task tab.
 */
function ResultsHeatmap({
	acId,
	participants,
	tasks,
	averageOverallScore,
}: {
	acId: string;
	participants: Participants;
	tasks: Tasks;
	averageOverallScore: number | null;
}) {
	return (
		<Card data-testid="results-heatmap">
			<CardHeader>
				<CardTitle>Wer war wo stark?</CardTitle>
				<CardDescription>
					Jede Zelle vergleicht mit dem Durchschnitt der Aufgabe: grün ▲
					darüber, rot ▼ darunter, grau im Schnitt.{" "}
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
										<span className="block font-normal text-xs">
											Ø {formatPercent(task.averageScore)}
										</span>
									</th>
								))}
								<th className="px-2 py-1 text-center font-medium">
									Gesamt
									<span className="block font-normal text-muted-foreground text-xs">
										Ø {formatPercent(averageOverallScore)}
									</span>
								</th>
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
												mean={task.averageScore}
												score={result?.score ?? null}
											/>
										);
									})}
									<HeatCell
										label={`${participant.name}, Gesamtwert`}
										mean={averageOverallScore}
										score={participant.overallScore}
									/>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<ToneLegend />
			</CardContent>
		</Card>
	);
}

export { ResultsHeatmap };
