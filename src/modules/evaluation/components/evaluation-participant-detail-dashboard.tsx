"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { EvaluationParticipantDetailData } from "../server/get-evaluation-participant-detail-data";

type ViewData = EvaluationParticipantDetailData["views"][number];
type GroupData = ViewData["groups"][number];

type RankLevel =
	| "hervorragend"
	| "gut"
	| "durchschnitt"
	| "entwicklungsfeld"
	| "schwäche";

type RankConfig = {
	label: string;
	barColorClass: string;
	pillClass: string;
	deltaTextClass: string;
};

type RadarChartDatum = {
	axisId: string;
	taskLabel: string;
	criteriaGroupLabelLines: string[];
	participant: number;
	benchmark: number;
};

type RadarAxisTickPayload = {
	value?: string;
};

type RadarAxisTickProps = {
	x?: number;
	y?: number;
	textAnchor?: string;
	payload?: RadarAxisTickPayload;
};

const RANK_CONFIG: Record<RankLevel, RankConfig> = {
	hervorragend: {
		label: "Hervorragend",
		barColorClass: "bg-green-500",
		pillClass: "bg-green-50 text-green-800 border-green-200",
		deltaTextClass: "text-green-700",
	},
	gut: {
		label: "Gut",
		barColorClass: "bg-green-400",
		pillClass: "bg-green-50 text-green-700 border-green-200",
		deltaTextClass: "text-green-600",
	},
	durchschnitt: {
		label: "Durchschnitt",
		barColorClass: "bg-yellow-400",
		pillClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
		deltaTextClass: "text-muted-foreground",
	},
	entwicklungsfeld: {
		label: "Entwicklungsfeld",
		barColorClass: "bg-orange-400",
		pillClass: "bg-orange-50 text-orange-700 border-orange-200",
		deltaTextClass: "text-orange-600",
	},
	schwäche: {
		label: "Schwäche",
		barColorClass: "bg-red-500",
		pillClass: "bg-red-50 text-red-800 border-red-200",
		deltaTextClass: "text-red-700",
	},
};

const CHART_CONFIG = {
	participant: {
		label: "Teilnehmer",
		color: "hsl(220 70% 50%)",
	},
	benchmark: {
		label: "Benchmark",
		color: "hsl(150 55% 42%)",
	},
} satisfies ChartConfig;

function getRankLevel(delta: number | null): RankLevel {
	if (delta === null) return "durchschnitt";
	if (delta >= 0.5) return "hervorragend";
	if (delta >= 0.2) return "gut";
	if (delta > -0.2) return "durchschnitt";
	if (delta > -0.5) return "entwicklungsfeld";
	return "schwäche";
}

function formatScore(value: number | null): string {
	return value === null ? "–" : value.toFixed(2);
}

function formatDelta(value: number | null): string {
	if (value === null) return "–";
	if (value === 0) return "±0.00";
	return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function getGridColsClass(count: number): string {
	if (count === 2) return "md:grid-cols-2";
	if (count >= 3) return "md:grid-cols-3";
	return "";
}

function splitLabelIntoLines(label: string, maxLineLength: number): string[] {
	const words = label.trim().split(/\s+/);
	const lines: string[] = [];
	let currentLine = "";

	for (const word of words) {
		const nextLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
		if (nextLine.length <= maxLineLength) {
			currentLine = nextLine;
			continue;
		}

		if (currentLine.length > 0) {
			lines.push(currentLine);
		}
		currentLine = word;
	}

	if (currentLine.length > 0) {
		lines.push(currentLine);
	}

	return lines.length > 0 ? lines : [label];
}

function buildRadarChartData(view: ViewData): RadarChartDatum[] {
	return view.groups.map((group) => ({
		axisId: group.axisId,
		taskLabel: group.taskName,
		criteriaGroupLabelLines: splitLabelIntoLines(group.criteriaGroupTitle, 18),
		participant: group.participantScore ?? 0,
		benchmark: group.benchmarkScore ?? 0,
	}));
}

function getRadarChartDatum(value: unknown): RadarChartDatum | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}

	if (!("taskLabel" in value) || typeof value.taskLabel !== "string") {
		return null;
	}

	if (
		!("criteriaGroupLabelLines" in value) ||
		!Array.isArray(value.criteriaGroupLabelLines) ||
		!value.criteriaGroupLabelLines.every((line) => typeof line === "string")
	) {
		return null;
	}

	if (!("axisId" in value) || typeof value.axisId !== "string") {
		return null;
	}

	if (!("participant" in value) || typeof value.participant !== "number") {
		return null;
	}

	if (!("benchmark" in value) || typeof value.benchmark !== "number") {
		return null;
	}

	return {
		axisId: value.axisId,
		taskLabel: value.taskLabel,
		criteriaGroupLabelLines: value.criteriaGroupLabelLines,
		participant: value.participant,
		benchmark: value.benchmark,
	};
}

function getRadarTickTextAnchor(
	value: string | undefined,
): "middle" | "start" | "end" {
	if (value === "start" || value === "end") {
		return value;
	}

	return "middle";
}

function findRadarChartDatum(
	chartData: RadarChartDatum[],
	axisId: string | undefined,
): RadarChartDatum | null {
	if (axisId === undefined) {
		return null;
	}

	return chartData.find((datum) => datum.axisId === axisId) ?? null;
}

function RadarAxisTick({
	x,
	y,
	textAnchor,
	payload,
	chartData,
}: RadarAxisTickProps & {
	chartData: RadarChartDatum[];
}) {
	if (x === undefined || y === undefined) {
		return null;
	}

	const datum = findRadarChartDatum(chartData, payload?.value);
	if (datum === null) {
		return null;
	}

	const { taskLabel, criteriaGroupLabelLines } = datum;
	const allLines = [taskLabel, ...criteriaGroupLabelLines];
	const startOffset = -((allLines.length - 1) * 14) / 2;

	return (
		<text
			fill="currentColor"
			fontSize={11}
			textAnchor={getRadarTickTextAnchor(textAnchor)}
			x={x}
			y={y}
		>
			<title>{`${taskLabel} · ${criteriaGroupLabelLines.join(" ")}`}</title>
			{allLines.map((line, index) => (
				<tspan
					dominantBaseline={index === 0 ? "auto" : undefined}
					dy={index === 0 ? startOffset : 14}
					fontWeight={index === 0 ? 600 : 400}
					key={index === 0 ? `task-${line}` : `group-${line}`}
					x={x}
				>
					{line}
				</tspan>
			))}
		</text>
	);
}

function RankPill({
	delta,
	className,
}: {
	delta: number | null;
	className?: string;
}) {
	const rank = getRankLevel(delta);
	const config = RANK_CONFIG[rank];
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-xs",
				config.pillClass,
				className,
			)}
		>
			{config.label}
		</span>
	);
}

type Props = { data: EvaluationParticipantDetailData };

function EvaluationParticipantDetailDashboard({ data }: Props) {
	const allView = data.views.find((v) => v.filter === "ALL");
	const competenceView = data.views.find((v) => v.filter === "COMPETENCE");
	const potentialView = data.views.find((v) => v.filter === "POTENTIAL");

	if (!allView || allView.groups.length === 0) {
		return (
			<Card>
				<CardContent className="flex min-h-40 items-center justify-center">
					<p className="text-muted-foreground text-sm">
						Keine auswertbaren Kriteriengruppen verfügbar.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<ViewSummaryRow views={data.views} />
			<div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
				<PerformanceRadarCard views={data.views} />
				<InsightCard view={allView} />
			</div>
			<FactorBreakdown
				competenceView={competenceView ?? null}
				potentialView={potentialView ?? null}
			/>
			<GroupScoresTable view={allView} />
		</div>
	);
}

function ViewSummaryRow({
	views,
}: {
	views: EvaluationParticipantDetailData["views"];
}) {
	const visibleViews = views.filter((v) => v.groupCount > 0);
	const gridColsClass = getGridColsClass(visibleViews.length);

	return (
		<div className={cn("grid gap-4", gridColsClass)}>
			{visibleViews.map((view) => (
				<ViewSummaryCard key={view.filter} view={view} />
			))}
		</div>
	);
}

function ViewSummaryCard({ view }: { view: ViewData }) {
	const isAbove = (view.deltaAverage ?? 0) > 0.05;
	const isBelow = (view.deltaAverage ?? 0) < -0.05;

	return (
		<Card size="sm">
			<CardContent className="space-y-3">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-0.5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							{view.label}
						</p>
						<p className="font-bold text-3xl tabular-nums">
							{formatScore(view.participantAverage)}
						</p>
					</div>
					<RankPill className="mt-1 shrink-0" delta={view.deltaAverage} />
				</div>
				<div className="flex items-center gap-1.5 text-muted-foreground text-sm">
					{isAbove && (
						<TrendingUp className="h-3.5 w-3.5 shrink-0 text-green-600" />
					)}
					{isBelow && (
						<TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-600" />
					)}
					<span>
						Benchmark {formatScore(view.benchmarkAverage)}{" "}
						<span
							className={cn(
								"font-medium",
								isAbove && "text-green-700",
								isBelow && "text-red-700",
							)}
						>
							({formatDelta(view.deltaAverage)})
						</span>
					</span>
				</div>
				<p className="text-muted-foreground text-xs">
					{view.scoredGroupCount} / {view.groupCount} Gruppen bewertet
				</p>
			</CardContent>
		</Card>
	);
}

function PerformanceRadarCard({ views }: { views: ViewData[] }) {
	const tabbedViews = views.filter((v) => v.groups.length > 0);
	const defaultTab = tabbedViews[0]?.filter ?? "ALL";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Performance-Profil</CardTitle>
				<CardDescription>Teilnehmer vs. Benchmark nach Bereich</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue={defaultTab}>
					<TabsList>
						{tabbedViews.map((view) => (
							<TabsTrigger key={view.filter} value={view.filter}>
								{view.label}
							</TabsTrigger>
						))}
					</TabsList>
					{tabbedViews.map((view) => (
						<TabsContent key={view.filter} value={view.filter}>
							<RadarChartContent view={view} />
						</TabsContent>
					))}
				</Tabs>
			</CardContent>
		</Card>
	);
}

function RadarChartContent({ view }: { view: ViewData }) {
	const chartData = buildRadarChartData(view);

	return (
		<ChartContainer
			className="mx-auto aspect-square max-h-[560px]"
			config={CHART_CONFIG}
		>
			<RadarChart
				data={chartData}
				margin={{ top: 32, right: 72, bottom: 32, left: 72 }}
			>
				<ChartTooltip
					content={
						<ChartTooltipContent
							formatter={(value, name) => (
								<div className="flex min-w-40 items-center justify-between gap-3">
									<span>{name}</span>
									<span className="font-mono tabular-nums">
										{typeof value === "number" ? value.toFixed(2) : "–"}
									</span>
								</div>
							)}
							labelFormatter={(_, payload) => {
								const datum = getRadarChartDatum(payload[0]?.payload);
								if (datum === null) {
									return "";
								}

								return `${datum.taskLabel} · ${datum.criteriaGroupLabelLines.join(" ")}`;
							}}
						/>
					}
				/>
				<ChartLegend content={<ChartLegendContent />} />
				<PolarGrid />
				<PolarAngleAxis
					dataKey="axisId"
					tick={<RadarAxisTick chartData={chartData} />}
					tickLine={false}
				/>
				<PolarRadiusAxis
					angle={90}
					domain={[0, 5]}
					tick={{ fontSize: 10 }}
					tickCount={6}
				/>
				<Radar
					dataKey="participant"
					fill="var(--color-participant)"
					fillOpacity={0.22}
					name="Teilnehmer"
					stroke="var(--color-participant)"
					strokeWidth={2}
				/>
				<Radar
					dataKey="benchmark"
					fill="var(--color-benchmark)"
					fillOpacity={0.12}
					name="Benchmark"
					stroke="var(--color-benchmark)"
					strokeWidth={2}
				/>
			</RadarChart>
		</ChartContainer>
	);
}

function InsightCard({ view }: { view: ViewData }) {
	const groupsWithDelta = view.groups.filter((g) => g.delta !== null);
	const strengths = [...groupsWithDelta]
		.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
		.filter((g) => (g.delta ?? 0) >= 0.2)
		.slice(0, 3);
	const developments = [...groupsWithDelta]
		.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
		.filter((g) => (g.delta ?? 0) <= -0.2)
		.slice(0, 3);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Stärken & Entwicklungsfelder</CardTitle>
				<CardDescription>Abweichungen gegenüber dem Benchmark</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<InsightList
					emptyLabel="Keine ausgeprägten Stärken"
					isStrength={true}
					items={strengths}
					title={`Stärken (${strengths.length})`}
				/>
				<Separator />
				<InsightList
					emptyLabel="Keine ausgeprägten Entwicklungsfelder"
					isStrength={false}
					items={developments}
					title={`Entwicklungsfelder (${developments.length})`}
				/>
			</CardContent>
		</Card>
	);
}

type InsightListProps = {
	title: string;
	items: GroupData[];
	emptyLabel: string;
	isStrength: boolean;
};

function InsightList({
	title,
	items,
	emptyLabel,
	isStrength,
}: InsightListProps) {
	return (
		<div className="space-y-2">
			<p className="flex items-center gap-1.5 font-medium text-sm">
				{isStrength ? (
					<TrendingUp className="h-4 w-4 shrink-0 text-green-600" />
				) : (
					<TrendingDown className="h-4 w-4 shrink-0 text-red-600" />
				)}
				{title}
			</p>
			{items.length === 0 ? (
				<p className="pl-5 text-muted-foreground text-xs">{emptyLabel}</p>
			) : (
				<ul className="space-y-1.5">
					{items.map((group) => (
						<InsightItem
							group={group}
							isStrength={isStrength}
							key={group.axisId}
						/>
					))}
				</ul>
			)}
		</div>
	);
}

function InsightItem({
	group,
	isStrength,
}: {
	group: GroupData;
	isStrength: boolean;
}) {
	return (
		<li className="flex items-center justify-between gap-2 pl-5">
			<span className="min-w-0 truncate text-muted-foreground text-sm">
				{group.taskName} · {group.criteriaGroupTitle}
			</span>
			<span
				className={cn(
					"shrink-0 font-mono font-semibold text-xs tabular-nums",
					isStrength ? "text-green-700" : "text-red-700",
				)}
			>
				{formatDelta(group.delta)}
			</span>
		</li>
	);
}

type FactorBreakdownProps = {
	competenceView: ViewData | null;
	potentialView: ViewData | null;
};

function FactorBreakdown({
	competenceView,
	potentialView,
}: FactorBreakdownProps) {
	const showCompetence =
		competenceView !== null && competenceView.groups.length > 0;
	const showPotential =
		potentialView !== null && potentialView.groups.length > 0;

	if (!showCompetence && !showPotential) {
		return null;
	}

	const isSplit = showCompetence && showPotential;

	return (
		<div className={cn("grid gap-6", isSplit && "xl:grid-cols-2")}>
			{showCompetence && competenceView && (
				<FactorGroupBars label="Kompetenzen" view={competenceView} />
			)}
			{showPotential && potentialView && (
				<FactorGroupBars label="Potenziale" view={potentialView} />
			)}
		</div>
	);
}

function FactorGroupBars({ label, view }: { label: string; view: ViewData }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{label}</CardTitle>
				<CardDescription>
					Teilnehmerwert je Kriteriengruppe · Benchmark-Markierung sichtbar
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{view.groups.map((group) => (
					<GroupBar group={group} key={group.axisId} />
				))}
			</CardContent>
		</Card>
	);
}

function GroupBar({ group }: { group: GroupData }) {
	const rank = getRankLevel(group.delta);
	const config = RANK_CONFIG[rank];
	const participantPct = ((group.participantScore ?? 0) / 5) * 100;
	const benchmarkPct = ((group.benchmarkScore ?? 0) / 5) * 100;

	return (
		<div className="space-y-1.5">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate font-medium text-sm">
						{group.criteriaGroupTitle}
					</p>
					<p className="truncate text-muted-foreground text-xs">
						{group.taskName}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="font-mono font-semibold text-sm tabular-nums">
						{formatScore(group.participantScore)}
					</span>
					<RankPill delta={group.delta} />
				</div>
			</div>
			<div className="relative h-2 rounded-full bg-muted">
				<div
					className={cn("h-full rounded-full", config.barColorClass)}
					style={{ width: `${participantPct}%` }}
				/>
				{group.benchmarkScore !== null && (
					<div
						className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/50"
						style={{ left: `calc(${benchmarkPct}% - 1px)` }}
					/>
				)}
			</div>
			<p className="text-muted-foreground text-xs">
				Benchmark: {formatScore(group.benchmarkScore)} ·{" "}
				<span className={cn("font-medium", config.deltaTextClass)}>
					{formatDelta(group.delta)}
				</span>
			</p>
		</div>
	);
}

function GroupScoresTable({ view }: { view: ViewData }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Detailübersicht</CardTitle>
				<CardDescription>
					Alle quantitativen Kriteriengruppen im Überblick
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Aufgabe</TableHead>
							<TableHead>Kriteriengruppe</TableHead>
							<TableHead>Typ</TableHead>
							<TableHead className="text-right">Teilnehmer</TableHead>
							<TableHead className="text-right">Benchmark</TableHead>
							<TableHead className="text-right">Delta</TableHead>
							<TableHead>Einordnung</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{view.groups.map((group) => (
							<GroupTableRow group={group} key={group.axisId} />
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function GroupTableRow({ group }: { group: GroupData }) {
	const rank = getRankLevel(group.delta);
	const config = RANK_CONFIG[rank];

	return (
		<TableRow>
			<TableCell className="font-medium">{group.taskName}</TableCell>
			<TableCell>{group.criteriaGroupTitle}</TableCell>
			<TableCell>
				<span className="text-muted-foreground text-xs">
					{group.factorType === "POTENTIAL" ? "Potenzial" : "Kompetenz"}
				</span>
			</TableCell>
			<TableCell className="text-right font-mono tabular-nums">
				{formatScore(group.participantScore)}
			</TableCell>
			<TableCell className="text-right font-mono text-muted-foreground tabular-nums">
				{formatScore(group.benchmarkScore)}
			</TableCell>
			<TableCell className="text-right font-mono tabular-nums">
				<span className={cn("font-semibold", config.deltaTextClass)}>
					{formatDelta(group.delta)}
				</span>
			</TableCell>
			<TableCell>
				<RankPill delta={group.delta} />
			</TableCell>
		</TableRow>
	);
}

export { EvaluationParticipantDetailDashboard };
