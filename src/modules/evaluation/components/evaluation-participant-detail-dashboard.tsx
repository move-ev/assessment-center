"use client";

import {
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EvaluationParticipantDetailData } from "../server/get-evaluation-participant-detail-data";

type Props = {
	data: EvaluationParticipantDetailData;
};

const chartConfig = {
	participant: {
		label: "Teilnehmer",
		color: "hsl(200 90% 45%)",
	},
	benchmark: {
		label: "Benchmark",
		color: "hsl(150 55% 42%)",
	},
} satisfies ChartConfig;

function EvaluationParticipantDetailDashboard({ data }: Props) {
	const defaultView = data.views[0]?.filter ?? "ALL";

	return (
		<Tabs className="space-y-6" defaultValue={defaultView}>
			<TabsList>
				{data.views.map((view) => (
					<TabsTrigger key={view.filter} value={view.filter}>
						{view.label}
					</TabsTrigger>
				))}
			</TabsList>

			{data.views.map((view) => (
				<TabsContent
					className="space-y-6"
					key={view.filter}
					value={view.filter}
				>
					<ViewSummaryGrid
						completedAssignmentCount={data.participant.completedAssignmentCount}
						groupCount={view.groupCount}
						overallScore={data.participant.overallScore}
						scoredGroupCount={view.scoredGroupCount}
						totalAssignmentCount={data.participant.totalAssignmentCount}
						view={view}
					/>
					<div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
						<PerformanceRadarCard view={view} />
						<GroupDeltaCard view={view} />
					</div>
					<GroupScoresTable view={view} />
				</TabsContent>
			))}
		</Tabs>
	);
}

function ViewSummaryGrid({
	view,
	overallScore,
	completedAssignmentCount,
	totalAssignmentCount,
	scoredGroupCount,
	groupCount,
}: {
	view: EvaluationParticipantDetailData["views"][number];
	overallScore: number | null;
	completedAssignmentCount: number;
	totalAssignmentCount: number;
	scoredGroupCount: number;
	groupCount: number;
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<SummaryCard
				description="Gewichteter Mittelwert über alle quantitativen Kriteriengruppen."
				label="Gesamtwert"
				value={formatScore(overallScore)}
			/>
			<SummaryCard
				description={getAverageDescription(view.label)}
				label="Eigener Schnitt"
				value={formatScore(view.participantAverage)}
			/>
			<SummaryCard
				description="Mittelwert aller Teilnehmer in derselben Ansicht."
				label="Benchmark"
				value={formatScore(view.benchmarkAverage)}
			/>
			<SummaryCard
				description={`${completedAssignmentCount} von ${totalAssignmentCount} Bewertungen vollständig erfasst.`}
				label="Bewertete Gruppen"
				value={`${scoredGroupCount} / ${groupCount}`}
			/>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	description,
}: {
	label: string;
	value: string;
	description: string;
}) {
	return (
		<Card size="sm">
			<CardHeader className="pb-0">
				<CardTitle className="text-muted-foreground text-sm">{label}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1">
				<p className="font-semibold text-2xl">{value}</p>
				<p className="text-muted-foreground text-sm">{description}</p>
			</CardContent>
		</Card>
	);
}

function PerformanceRadarCard({
	view,
}: {
	view: EvaluationParticipantDetailData["views"][number];
}) {
	if (view.groups.length === 0) {
		return <EmptyViewCard title="Keine Kriteriengruppen in dieser Ansicht." />;
	}

	const chartData = view.groups.map((group) => ({
		label: `${group.taskName} · ${group.criteriaGroupTitle}`,
		participant: group.participantScore,
		benchmark: group.benchmarkScore,
	}));

	return (
		<Card>
			<CardHeader className="gap-2">
				<CardTitle>Performance nach Kriteriengruppe</CardTitle>
				<p className="text-muted-foreground text-sm">
					Der Radar-Chart zeigt den Teilnehmerwert gegenüber dem Mittelwert
					aller Teilnehmer.
				</p>
			</CardHeader>
			<CardContent>
				<ChartContainer
					className="mx-auto aspect-square max-h-[520px]"
					config={chartConfig}
				>
					<RadarChart data={chartData}>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value, name) => (
										<div className="flex min-w-40 items-center justify-between gap-3">
											<span>{name}</span>
											<span className="font-mono tabular-nums">
												{typeof value === "number" ? value.toFixed(2) : "n/a"}
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
							tick={{ fontSize: 11 }}
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
			</CardContent>
		</Card>
	);
}

function GroupDeltaCard({
	view,
}: {
	view: EvaluationParticipantDetailData["views"][number];
}) {
	if (view.groups.length === 0) {
		return <EmptyViewCard title="Kein Benchmark-Vergleich verfügbar." />;
	}

	const strongestGroup = [...view.groups]
		.filter((group) => group.delta !== null)
		.sort((left, right) => (right.delta ?? 0) - (left.delta ?? 0))[0];
	const weakestGroup = [...view.groups]
		.filter((group) => group.delta !== null)
		.sort((left, right) => (left.delta ?? 0) - (right.delta ?? 0))[0];

	return (
		<Card>
			<CardHeader className="gap-2">
				<CardTitle>Einordnung</CardTitle>
				<p className="text-muted-foreground text-sm">
					Positive Werte liegen über dem Mittelwert, negative darunter.
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				<DeltaMetric
					delta={view.deltaAverage}
					label="Abweichung im Schnitt"
					sublabel={`${view.label}-Ansicht`}
				/>
				<DeltaMetric
					delta={strongestGroup?.delta ?? null}
					label="Stärkste Gruppe"
					sublabel={formatGroupLabel(strongestGroup)}
				/>
				<DeltaMetric
					delta={weakestGroup?.delta ?? null}
					label="Größter Abstand"
					sublabel={formatGroupLabel(weakestGroup)}
				/>
			</CardContent>
		</Card>
	);
}

function DeltaMetric({
	label,
	sublabel,
	delta,
}: {
	label: string;
	sublabel: string;
	delta: number | null;
}) {
	return (
		<div className="rounded-3xl border bg-muted/20 p-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="font-medium text-sm">{label}</p>
					<p className="text-muted-foreground text-sm">{sublabel}</p>
				</div>
				<Badge variant={getDeltaVariant(delta)}>{formatDelta(delta)}</Badge>
			</div>
		</div>
	);
}

function GroupScoresTable({
	view,
}: {
	view: EvaluationParticipantDetailData["views"][number];
}) {
	if (view.groups.length === 0) {
		return (
			<EmptyViewCard title="Keine tabellarischen Daten für diese Ansicht." />
		);
	}

	return (
		<Card>
			<CardHeader className="gap-2">
				<CardTitle>Kriteriengruppen im Detail</CardTitle>
				<p className="text-muted-foreground text-sm">
					Alle Werte basieren auf aggregierten Gruppenwerten, nicht auf
					Einzelkriterien.
				</p>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Aufgabe</TableHead>
							<TableHead>Kriteriengruppe</TableHead>
							<TableHead>Typ</TableHead>
							<TableHead>Kriterien</TableHead>
							<TableHead>Teilnehmer</TableHead>
							<TableHead>Benchmark</TableHead>
							<TableHead>Delta</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{view.groups.map((group) => (
							<TableRow key={group.axisId}>
								<TableCell className="font-medium">{group.taskName}</TableCell>
								<TableCell>{group.criteriaGroupTitle}</TableCell>
								<TableCell>
									<Badge
										variant={
											group.factorType === "POTENTIAL" ? "secondary" : "outline"
										}
									>
										{group.factorType === "POTENTIAL"
											? "Potenzial"
											: "Kompetenz"}
									</Badge>
								</TableCell>
								<TableCell>{group.criteriaCount}</TableCell>
								<TableCell>{formatScore(group.participantScore)}</TableCell>
								<TableCell>{formatScore(group.benchmarkScore)}</TableCell>
								<TableCell>
									<Badge variant={getDeltaVariant(group.delta)}>
										{formatDelta(group.delta)}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function EmptyViewCard({ title }: { title: string }) {
	return (
		<Card>
			<CardContent className="flex min-h-64 items-center justify-center">
				<p className="text-muted-foreground text-sm">{title}</p>
			</CardContent>
		</Card>
	);
}

function formatScore(value: number | null) {
	return value === null ? "n/a" : value.toFixed(2);
}

function formatDelta(value: number | null) {
	if (value === null) {
		return "n/a";
	}

	if (value === 0) {
		return "0.00";
	}

	return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function getDeltaVariant(value: number | null) {
	if (value === null) {
		return "outline" as const;
	}

	if (value > 0) {
		return "default" as const;
	}

	if (value < 0) {
		return "destructive" as const;
	}

	return "secondary" as const;
}

function formatGroupLabel(
	group:
		| EvaluationParticipantDetailData["views"][number]["groups"][number]
		| undefined,
) {
	if (!group) {
		return "Keine Daten";
	}

	return `${group.taskName} · ${group.criteriaGroupTitle}`;
}

function getAverageDescription(label: string) {
	if (label === "Gesamt") {
		return "Vergleich über alle quantitativen Kriteriengruppen.";
	}

	return `Vergleich über ${label.toLowerCase()}-Kriteriengruppen.`;
}

export { EvaluationParticipantDetailDashboard };
