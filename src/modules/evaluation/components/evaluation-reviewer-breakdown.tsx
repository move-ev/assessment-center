import { UserRound } from "lucide-react";
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
import { formatPercent, formatSpread } from "@/lib/format-percent";
import type { EvaluationParticipantDetailData } from "../server/get-evaluation-participant-detail-data";
import type { ReviewerBreakdownData } from "../server/get-participant-reviewer-breakdown";
import { DeviationBadge } from "./deviation-badge";
import {
	LegendItem,
	StripAxis,
	StripDot,
	StripTick,
	StripTrack,
	seriesColor,
} from "./score-strip";

function getScoreForTask(
	scores: ReviewerBreakdownData["reviewers"][number]["scores"],
	taskId: string,
): number | null {
	return scores.find((s) => s.taskId === taskId)?.score ?? null;
}

type TaskScores = EvaluationParticipantDetailData["taskScores"];

/**
 * Each reviewer as a dot per task, the task score as a tick: the spread
 * between reviewers becomes visible instead of only named.
 */
function ReviewerDots({
	data,
	taskScores,
}: {
	data: ReviewerBreakdownData;
	taskScores: TaskScores;
}) {
	return (
		<div className="space-y-4">
			<ul className="space-y-3">
				{data.tasks.map((task) => {
					const taskScore = taskScores.find(
						(entry) => entry.taskId === task.taskId,
					);
					const dots = data.reviewers.flatMap((reviewer, index) => {
						const score = getScoreForTask(reviewer.scores, task.taskId);
						return score === null ? [] : [{ reviewer, index, score }];
					});
					const description = dots
						.map(
							(dot) =>
								`${dot.reviewer.reviewerName} ${formatPercent(dot.score)}`,
						)
						.join(", ");

					return (
						<li
							className="grid grid-cols-[minmax(7rem,11rem)_1fr_5.5rem] items-center gap-4"
							key={task.taskId}
						>
							<div>
								<p className="font-medium text-sm">{task.taskName}</p>
								{taskScore?.hasStrongDeviation && <DeviationBadge />}
							</div>
							<StripTrack
								label={`${task.taskName}: ${description || "keine Bewertung"}`}
							>
								{taskScore?.score !== null &&
									taskScore?.score !== undefined && (
										<StripTick
											score={taskScore.score}
											title={`Teil-Score ${formatPercent(taskScore.score)}`}
										/>
									)}
								{dots.map((dot) => (
									<StripDot
										color={seriesColor(dot.index)}
										key={dot.reviewer.reviewerId}
										score={dot.score}
										title={`${dot.reviewer.reviewerName}: ${formatPercent(dot.score)}`}
									/>
								))}
							</StripTrack>
							<p className="text-right text-muted-foreground text-xs tabular-nums">
								Spanne
								<br />
								{formatSpread(taskScore?.reviewerSpread ?? null)}
							</p>
						</li>
					);
				})}
			</ul>
			<div className="grid grid-cols-[minmax(7rem,11rem)_1fr_5.5rem] gap-4">
				<span />
				<StripAxis />
			</div>
			<div className="flex flex-wrap gap-4">
				{data.reviewers.map((reviewer, index) => (
					<LegendItem
						color={seriesColor(index)}
						key={reviewer.reviewerId}
						label={reviewer.reviewerName}
					/>
				))}
				<LegendItem
					color="color-mix(in oklab, var(--foreground) 70%, transparent)"
					label="Teil-Score (Mittelwert)"
					shape="tick"
				/>
			</div>
		</div>
	);
}

function ReviewerBreakdownCard({
	data,
	taskScores,
}: {
	data: ReviewerBreakdownData;
	taskScores: TaskScores;
}) {
	if (data.reviewers.length === 0 || data.tasks.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UserRound className="h-4 w-4 text-muted-foreground" />
					Bewertungen nach Beobachter
				</CardTitle>
				<CardDescription>
					Teil-Score je Aufgabe aus den Bewertungen eines Beobachters
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<ReviewerDots data={data} taskScores={taskScores} />
				<details className="group">
					<summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
						Als Tabelle anzeigen
					</summary>
					<div className="mt-3 overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="min-w-48">Aufgabe</TableHead>
									{data.reviewers.map((reviewer, index) => (
										<TableHead
											className="min-w-28 text-right"
											key={reviewer.reviewerId}
										>
											<span className="inline-flex items-center gap-1.5">
												<span
													aria-hidden
													className="size-2.5 rounded-full"
													style={{ backgroundColor: seriesColor(index) }}
												/>
												{reviewer.reviewerName}
											</span>
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.tasks.map((task) => (
									<TableRow key={task.taskId}>
										<TableCell className="font-medium">
											{task.taskName}
										</TableCell>
										{data.reviewers.map((reviewer) => {
											const score = getScoreForTask(
												reviewer.scores,
												task.taskId,
											);
											return (
												<TableCell
													className="text-right font-mono tabular-nums"
													key={reviewer.reviewerId}
												>
													<span
														className={
															score === null
																? "text-muted-foreground"
																: undefined
														}
													>
														{formatPercent(score)}
													</span>
												</TableCell>
											);
										})}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</details>
			</CardContent>
		</Card>
	);
}

export { ReviewerBreakdownCard };
