import { InfoIcon, MessageSquareText, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { STAR_SPREAD_HIGHLIGHT } from "../server/criteria-breakdown";
import type {
	BreakdownCriterion,
	ReviewerBreakdownData,
	TaskCriteriaBreakdown,
} from "../server/get-participant-reviewer-breakdown";
import { seriesColor } from "./score-strip";

function formatStars(value: number | null | undefined): string {
	return value === null || value === undefined
		? "–"
		: value.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function describeAnchors(criterion: BreakdownCriterion): string | null {
	const anchors = [
		criterion.anchorStar2 ? `2 Sterne: ${criterion.anchorStar2}` : null,
		criterion.anchorStar4 ? `4 Sterne: ${criterion.anchorStar4}` : null,
	].filter(Boolean);
	return anchors.length === 0 ? null : anchors.join("\n");
}

function CriterionName({ criterion }: { criterion: BreakdownCriterion }) {
	const anchors = describeAnchors(criterion);

	return (
		<div>
			<div className="flex flex-wrap items-center gap-1.5">
				<span className="font-medium">{criterion.name}</span>
				{criterion.isOptional && <Badge variant="outline">optional</Badge>}
				{anchors && (
					<span
						aria-label={`Anker: ${anchors}`}
						className="text-muted-foreground"
						role="img"
						title={anchors}
					>
						<InfoIcon aria-hidden className="size-3.5" />
					</span>
				)}
			</div>
			<p className="text-muted-foreground text-xs">
				{criterion.criteriaGroupTitle}
				{criterion.weight !== null &&
					` · Gewicht ${criterion.weight.toLocaleString("de-DE")}`}
			</p>
		</div>
	);
}

function StarsTable({
	task,
	colorIndex,
	criterionAverages,
	ratingScaleMax,
}: {
	task: TaskCriteriaBreakdown;
	colorIndex: Map<string, number>;
	criterionAverages: Record<string, number | null>;
	ratingScaleMax: number;
}) {
	const rows = task.criteria.filter(
		(criterion) => criterion.type === "QUANTITATIVE",
	);

	if (rows.length === 0) {
		return null;
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="min-w-56">Kriterium</TableHead>
						{task.reviewers.map((reviewer) => (
							<TableHead className="text-center" key={reviewer.reviewerId}>
								<span className="inline-flex items-center gap-1.5">
									<span
										aria-hidden
										className="size-2.5 rounded-full"
										style={{
											backgroundColor: seriesColor(
												colorIndex.get(reviewer.reviewerId) ?? 8,
											),
										}}
									/>
									{reviewer.reviewerName}
								</span>
							</TableHead>
						))}
						<TableHead className="text-center">Spanne</TableHead>
						<TableHead className="text-center">Ø Person</TableHead>
						<TableHead className="text-center">Ø AC</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((criterion) => {
						const disputed =
							criterion.spread !== null &&
							criterion.spread >= STAR_SPREAD_HIGHLIGHT;
						return (
							<TableRow key={criterion.criteriaId}>
								<TableCell className="whitespace-normal">
									<CriterionName criterion={criterion} />
								</TableCell>
								{criterion.values.map((entry) => (
									<TableCell
										className="text-center tabular-nums"
										key={entry.reviewerId}
									>
										{entry.value === null ? (
											<span className="text-muted-foreground">–</span>
										) : (
											`${entry.value} / ${ratingScaleMax}`
										)}
									</TableCell>
								))}
								<TableCell className="text-center tabular-nums">
									<span
										className={cn(
											"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
											disputed &&
												"bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
										)}
										title={
											disputed
												? `Bewerter liegen ${criterion.spread} Sterne auseinander`
												: undefined
										}
									>
										{disputed && <TriangleAlertIcon className="size-3" />}
										{formatStars(criterion.spread)}
									</span>
								</TableCell>
								<TableCell className="text-center font-medium tabular-nums">
									{formatStars(criterion.mean)}
								</TableCell>
								<TableCell className="text-center text-muted-foreground tabular-nums">
									{formatStars(criterionAverages[criterion.criteriaId])}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

function WrittenFeedback({ task }: { task: TaskCriteriaBreakdown }) {
	const criteria = task.criteria.filter(
		(criterion) => criterion.type === "QUALITATIVE",
	);

	if (criteria.length === 0) {
		return null;
	}

	return (
		<div className="space-y-3" data-testid="written-feedback">
			<p className="flex items-center gap-2 font-medium text-sm">
				<MessageSquareText className="size-4 text-muted-foreground" />
				Schriftliche Rückmeldungen
			</p>
			{criteria.map((criterion) => (
				<div className="space-y-2" key={criterion.criteriaId}>
					<p className="text-muted-foreground text-xs">
						{criterion.criteriaGroupTitle} · {criterion.name}
					</p>
					{criterion.texts.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Keine Rückmeldung erfasst.
						</p>
					) : (
						<ul className="space-y-2">
							{criterion.texts.map((entry) => (
								<li
									className="rounded-lg border bg-muted/30 p-3"
									key={entry.reviewerId}
								>
									<p className="text-muted-foreground text-xs">
										{entry.reviewerName}
									</p>
									<p className="mt-1 whitespace-pre-wrap text-sm">
										{entry.text}
									</p>
								</li>
							))}
						</ul>
					)}
				</div>
			))}
		</div>
	);
}

function countTexts(task: TaskCriteriaBreakdown): number {
	return task.criteria.reduce(
		(sum, criterion) => sum + criterion.texts.length,
		0,
	);
}

/**
 * Per task, every reviewer's stars on every criterion next to the AC mean,
 * plus the written feedback: where a score or a spread comes from.
 */
function CriteriaDrilldown({
	breakdown,
	criterionAverages,
	ratingScaleMax,
}: {
	breakdown: ReviewerBreakdownData;
	criterionAverages: Record<string, number | null>;
	ratingScaleMax: number;
}) {
	if (breakdown.criteriaByTask.length === 0) {
		return null;
	}

	const colorIndex = new Map(
		breakdown.reviewers.map((reviewer, index) => [reviewer.reviewerId, index]),
	);

	return (
		<Card data-testid="criteria-drilldown">
			<CardHeader>
				<CardTitle>Bewertungen je Kriterium</CardTitle>
				<CardDescription>
					Sterne jedes Bewerters je Kriterium. Ab {STAR_SPREAD_HIGHLIGHT}{" "}
					Sternen Spanne ist das Kriterium markiert; Ø AC ist der Mittelwert
					aller Bewertungen dieses Kriteriums im AC.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{breakdown.criteriaByTask.map((task, index) => {
					const textCount = countTexts(task);
					return (
						<details
							className="group rounded-lg border"
							key={task.taskId}
							open={index === 0}
						>
							<summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
								<span className="font-medium">{task.taskName}</span>
								<span className="text-muted-foreground text-xs">
									{task.reviewers.length} Bewerter · {textCount}{" "}
									{textCount === 1 ? "Rückmeldung" : "Rückmeldungen"}
								</span>
							</summary>
							<div className="space-y-5 border-t px-4 py-4">
								<StarsTable
									colorIndex={colorIndex}
									criterionAverages={criterionAverages}
									ratingScaleMax={ratingScaleMax}
									task={task}
								/>
								<WrittenFeedback task={task} />
							</div>
						</details>
					);
				})}
			</CardContent>
		</Card>
	);
}

export { CriteriaDrilldown };
