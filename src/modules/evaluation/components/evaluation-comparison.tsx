import { ArrowLeft, TrophyIcon } from "lucide-react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { formatPercent } from "@/lib/format-percent";
import { ROUTES } from "@/lib/routes";
import type { EvaluationComparisonData } from "../server/get-evaluation-comparison-data";
import {
	type ComparisonIdsError,
	MAX_COMPARED,
	MIN_COMPARED,
} from "../server/participant-comparison";
import { stackDots } from "./chart-scales";
import { ComparisonPicker } from "./comparison-picker";
import { DeviationBadge } from "./deviation-badge";
import { RankingBandBadge } from "./ranking-band-badge";
import {
	axisPosition,
	LegendItem,
	StripAxis,
	StripDot,
	StripTick,
	StripTrack,
	seriesColor,
	TICK_COLOR,
} from "./score-strip";

type Selected = Extract<EvaluationComparisonData["selection"], { ok: true }>;
type Person = Selected["people"][number];

const RANGE_COLOR =
	"color-mix(in oklab, var(--muted-foreground) 22%, transparent)";

const INVALID_TEXT: Record<ComparisonIdsError, string> = {
	TOO_FEW: `Für eine Gegenüberstellung braucht es mindestens ${MIN_COMPARED} Bewerbende.`,
	TOO_MANY: `Es lassen sich höchstens ${MAX_COMPARED} Bewerbende gegenüberstellen.`,
	UNKNOWN: "Mindestens eine der gewählten Personen gehört nicht zu diesem AC.",
};

function formatGap(gap: number): string {
	return `${gap.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Pkt.`;
}

function PersonCard({
	acId,
	person,
	index,
	rankedCount,
}: {
	acId: string;
	person: Person;
	index: number;
	rankedCount: number;
}) {
	return (
		<Card data-testid="compared-person" size="sm">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center gap-2">
					<span
						aria-hidden
						className="size-3 shrink-0 rounded-full"
						style={{ backgroundColor: seriesColor(index) }}
					/>
					<Link
						className="underline-offset-4 hover:underline"
						href={ROUTES.acResultsParticipant(acId, person.id)}
					>
						{person.name}
					</Link>
				</CardTitle>
				<CardDescription>{person.groupName ?? "Keine Gruppe"}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="font-semibold text-3xl tabular-nums">
					{formatPercent(person.overallScore)}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-muted-foreground text-sm">
						{person.rank === null
							? "Rang –"
							: `Rang ${person.rank} von ${rankedCount}`}
					</span>
					{person.rankingBand && <RankingBandBadge band={person.rankingBand} />}
					{person.deviatingTaskNames.length > 0 && (
						<DeviationBadge taskNames={person.deviatingTaskNames} />
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function describeSummary(person: Person, taskCount: number): string {
	const lead = `vorn in ${person.leadCount} von ${taskCount} ${taskCount === 1 ? "Aufgabe" : "Aufgaben"}`;
	if (person.gapToBest === null) {
		return `${person.name}: ${lead}, Gesamtwert –`;
	}
	return person.gapToBest === 0
		? `${person.name}: ${lead}, bester Gesamtwert`
		: `${person.name}: ${lead}, ${formatGap(person.gapToBest)} hinter dem besten Gesamtwert`;
}

function SummaryCard({ selection }: { selection: Selected }) {
	return (
		<Card data-testid="comparison-summary">
			<CardHeader>
				<CardTitle>Kurzfazit</CardTitle>
				<CardDescription>
					Vorn liegt, wer in einer Aufgabe den höchsten Teil-Score hat;
					Gleichstand zählt für alle. Der Abstand ist aus den genauen
					Gesamtwerten berechnet.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="space-y-1.5 text-sm">
					{selection.people.map((person, index) => (
						<li className="flex items-center gap-2" key={person.id}>
							<span
								aria-hidden
								className="size-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: seriesColor(index) }}
							/>
							{describeSummary(person, selection.tasks.length)}
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

/** Vertical step between dots that would hide each other, in pixels. */
const DOT_OFFSET_PX = 8;

/**
 * The people's dots on one task strip; equal or near-equal scores sit just
 * above and below each other instead of on top of each other.
 */
function placeDots(people: Person[], taskId: string) {
	const dots = people.flatMap((person, index) => {
		const score = person.taskScores[taskId];
		return score === null || score === undefined
			? []
			: [{ person, index, score }];
	});
	const rows = stackDots(
		dots.map((dot) => dot.score),
		1.5,
	);
	const rowCount = Math.max(0, ...rows) + 1;

	return dots.map((dot, position) => ({
		...dot,
		top: `calc(50% + ${((rows[position] ?? 0) - (rowCount - 1) / 2) * DOT_OFFSET_PX}px)`,
	}));
}

function TaskStrips({ selection }: { selection: Selected }) {
	return (
		<Card data-testid="comparison-strips">
			<CardHeader>
				<CardTitle>Aufgaben im Vergleich zum AC</CardTitle>
				<CardDescription>
					Jede Person als Punkt; dahinter die Spanne und der Durchschnitt aller
					Bewerbenden des AC.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<ul className="space-y-3">
					{selection.tasks.map((task) => {
						const description = selection.people
							.map(
								(person) =>
									`${person.name} ${formatPercent(person.taskScores[task.id] ?? null)}`,
							)
							.join(", ");
						return (
							<li
								className="grid grid-cols-[minmax(7rem,11rem)_1fr] items-center gap-4"
								key={task.id}
							>
								<p className="font-medium text-sm">{task.name}</p>
								<StripTrack label={`${task.name}: ${description}`}>
									{task.minScore !== null && task.maxScore !== null && (
										<span
											className="absolute inset-y-1.5 rounded-sm"
											style={{
												left: axisPosition(task.minScore),
												width: axisPosition(task.maxScore - task.minScore),
												backgroundColor: RANGE_COLOR,
											}}
											title={`Spanne im AC: ${formatPercent(task.minScore)} bis ${formatPercent(task.maxScore)}`}
										/>
									)}
									{task.averageScore !== null && (
										<StripTick
											score={task.averageScore}
											title={`Durchschnitt im AC: ${formatPercent(task.averageScore)}`}
										/>
									)}
									{placeDots(selection.people, task.id).map((dot) => (
										<StripDot
											color={seriesColor(dot.index)}
											key={dot.person.id}
											score={dot.score}
											title={`${dot.person.name}: ${formatPercent(dot.score)}`}
											top={dot.top}
										/>
									))}
								</StripTrack>
							</li>
						);
					})}
				</ul>
				<div className="grid grid-cols-[minmax(7rem,11rem)_1fr] gap-4">
					<span />
					<StripAxis />
				</div>
				<div className="flex flex-wrap gap-4">
					{selection.people.map((person, index) => (
						<LegendItem
							color={seriesColor(index)}
							key={person.id}
							label={person.name}
						/>
					))}
					<LegendItem color={RANGE_COLOR} label="Spanne im AC" shape="band" />
					<LegendItem
						color={TICK_COLOR}
						label="Durchschnitt im AC"
						shape="tick"
					/>
				</div>
			</CardContent>
		</Card>
	);
}

function TaskBars({ selection }: { selection: Selected }) {
	return (
		<Card data-testid="comparison-bars">
			<CardHeader>
				<CardTitle>Teil-Scores je Aufgabe</CardTitle>
				<CardDescription>
					Der beste Wert jeder Aufgabe ist mit einem Pokal markiert.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{selection.tasks.map((task) => {
					return (
						<div
							className="space-y-1.5"
							data-testid="comparison-task"
							key={task.id}
						>
							<p className="font-medium text-sm">{task.name}</p>
							<ul className="space-y-1">
								{selection.people.map((person, index) => {
									const score = person.taskScores[task.id] ?? null;
									const leads = task.leaderIds.includes(person.id);
									return (
										<li
											className="grid grid-cols-[minmax(7rem,11rem)_1fr_5.5rem] items-center gap-3 text-sm"
											data-leader={leads || undefined}
											key={person.id}
										>
											<span className="truncate text-muted-foreground">
												{person.name}
											</span>
											<div aria-hidden className="h-4 rounded-sm bg-muted/40">
												{score !== null && (
													<span
														className="block h-full rounded-sm"
														style={{
															width: axisPosition(score),
															backgroundColor: seriesColor(index),
														}}
													/>
												)}
											</div>
											<span className="flex items-center justify-end gap-1 tabular-nums">
												{leads && (
													<>
														<TrophyIcon
															aria-hidden
															className="size-3.5 text-amber-600 dark:text-amber-400"
														/>
														<span className="sr-only">Bestwert:</span>
													</>
												)}
												{formatPercent(score)}
											</span>
										</li>
									);
								})}
							</ul>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

/**
 * 2–3 participants side by side: overall, against the AC per task, and who
 * leads where. People are chosen in the ranking and kept in the URL.
 */
function EvaluationComparison({
	acId,
	data,
}: {
	acId: string;
	data: EvaluationComparisonData;
}) {
	const { selection } = data;

	return (
		<div className="space-y-6 p-6">
			<div className="space-y-3">
				<Link
					className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
					href={ROUTES.acResults(acId)}
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Ergebnisübersicht
				</Link>
				<h1 className="font-medium text-xl">Gegenüberstellung</h1>
				{selection.ok && (
					<ComparisonPicker
						acId={acId}
						candidates={data.candidates}
						selectedIds={selection.people.map((person) => person.id)}
					/>
				)}
			</div>

			{selection.ok ? (
				<>
					<div className="grid gap-4 md:grid-cols-3">
						{selection.people.map((person, index) => (
							<PersonCard
								acId={acId}
								index={index}
								key={person.id}
								person={person}
								rankedCount={data.rankedCount}
							/>
						))}
					</div>
					<SummaryCard selection={selection} />
					<TaskStrips selection={selection} />
					<TaskBars selection={selection} />
				</>
			) : (
				<Empty className="max-w-xl border">
					<EmptyHeader>
						<EmptyTitle>Keine gültige Auswahl</EmptyTitle>
						<EmptyDescription>
							{INVALID_TEXT[selection.reason]} Wähle in der{" "}
							<Link href={ROUTES.acResults(acId)}>Rangliste</Link>{" "}
							{MIN_COMPARED}–{MAX_COMPARED} Bewerbende aus.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</div>
	);
}

export { EvaluationComparison };
