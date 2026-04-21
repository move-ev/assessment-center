"use client";

import {
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
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
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
				"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
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
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							{view.label}
						</p>
						<p className="text-3xl font-bold tabular-nums">
							{formatScore(view.participantAverage)}
						</p>
					</div>
					<RankPill className="mt-1 shrink-0" delta={view.deltaAverage} />
				</div>
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					{isAbove && <TrendingUp className="h-3.5 w-3.5 shrink-0 text-green-600" />}
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
				<p className="text-xs text-muted-foreground">
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
				<CardDescription>
					Teilnehmer vs. Benchmark nach Bereich
				</CardDescription>
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
	const chartData = view.groups.map((group) => ({
		label: `${group.taskName} · ${group.criteriaGroupTitle}`,
		participant: group.participantScore ?? 0,
		benchmark: group.benchmarkScore ?? 0,
	}));

	return (
		<ChartContainer
			className="mx-auto aspect-square max-h-[480px]"
			config={CHART_CONFIG}
		>
			<RadarChart data={chartData}>
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
							labelFormatter={(label) => String(label)}
						/>
					}
				/>
				<PolarGrid />
				<PolarAngleAxis
					dataKey="label"
					tick={{ fontSize: 11 }}
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

function InsightList({ title, items, emptyLabel, isStrength }: InsightListProps) {
	return (
		<div className="space-y-2">
			<p className="flex items-center gap-1.5 text-sm font-medium">
				{isStrength ? (
					<TrendingUp className="h-4 w-4 shrink-0 text-green-600" />
				) : (
					<TrendingDown className="h-4 w-4 shrink-0 text-red-600" />
				)}
				{title}
			</p>
			{items.length === 0 ? (
				<p className="pl-5 text-xs text-muted-foreground">{emptyLabel}</p>
			) : (
				<ul className="space-y-1.5">
					{items.map((group) => (
						<InsightItem group={group} isStrength={isStrength} key={group.axisId} />
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
			<span className="min-w-0 truncate text-sm text-muted-foreground">
				{group.taskName} · {group.criteriaGroupTitle}
			</span>
			<span
				className={cn(
					"shrink-0 font-mono text-xs font-semibold tabular-nums",
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

function FactorBreakdown({ competenceView, potentialView }: FactorBreakdownProps) {
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
					<p className="truncate text-sm font-medium">
						{group.criteriaGroupTitle}
					</p>
					<p className="truncate text-xs text-muted-foreground">
						{group.taskName}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="font-mono text-sm font-semibold tabular-nums">
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
			<p className="text-xs text-muted-foreground">
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
				<span className="text-xs text-muted-foreground">
					{group.factorType === "POTENTIAL" ? "Potenzial" : "Kompetenz"}
				</span>
			</TableCell>
			<TableCell className="text-right font-mono tabular-nums">
				{formatScore(group.participantScore)}
			</TableCell>
			<TableCell className="text-right font-mono tabular-nums text-muted-foreground">
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
