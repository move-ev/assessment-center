"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { formatPercent } from "@/lib/format-percent";
import { computeCorrelation } from "../server/comparison";
import { AXIS_TICKS } from "./score-strip";

export type ScatterParticipant = {
	id: string;
	name: string;
	scores: Record<string, number | null>;
};

type Props = {
	tasks: Array<{ id: string; name: string }>;
	participants: ScatterParticipant[];
};

const SIZE = 320;
const PAD = 36;
const PLOT = SIZE - PAD - 12;

function toX(score: number) {
	return PAD + (score / 100) * PLOT;
}

function toY(score: number) {
	return 12 + PLOT - (score / 100) * PLOT;
}

function describeCorrelation(correlation: number | null): string {
	if (correlation === null) {
		return "Zu wenige gemeinsame Werte für einen Zusammenhang.";
	}

	const strength = Math.abs(correlation);
	const word =
		strength >= 0.7 ? "starker" : strength >= 0.4 ? "mittlerer" : "schwacher";
	const direction = correlation >= 0 ? "gleichläufiger" : "gegenläufiger";

	return `${word} ${direction} Zusammenhang (r = ${correlation.toLocaleString("de-DE", { maximumFractionDigits: 2 })})`;
}

/**
 * Two tasks against each other, one dot per participant: do they measure
 * the same or something different? The tasks are chosen by the viewer.
 */
function TaskScatter({ tasks, participants }: Props) {
	const [xTaskId, setXTaskId] = useState(tasks[0]?.id ?? "");
	const [yTaskId, setYTaskId] = useState(tasks[1]?.id ?? "");

	const points = participants.flatMap((participant) => {
		const x = participant.scores[xTaskId];
		const y = participant.scores[yTaskId];
		return x === null || x === undefined || y === null || y === undefined
			? []
			: [{ id: participant.id, name: participant.name, x, y }];
	});
	const correlation = computeCorrelation(points);
	const xName = tasks.find((task) => task.id === xTaskId)?.name ?? "";
	const yName = tasks.find((task) => task.id === yTaskId)?.name ?? "";

	return (
		<Card data-testid="task-scatter">
			<CardHeader>
				<CardTitle>Aufgaben im Vergleich</CardTitle>
				<CardDescription>
					Jeder Punkt ist eine Bewerbende mit Werten in beiden Aufgaben.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap gap-4">
					<TaskSelect
						id="scatter-x"
						label="Waagrecht"
						onChange={setXTaskId}
						tasks={tasks}
						value={xTaskId}
					/>
					<TaskSelect
						id="scatter-y"
						label="Senkrecht"
						onChange={setYTaskId}
						tasks={tasks}
						value={yTaskId}
					/>
				</div>
				<svg
					aria-label={`${xName} gegen ${yName}: ${points.length} Bewerbende, ${describeCorrelation(correlation)}`}
					className="w-full max-w-sm"
					role="img"
					viewBox={`0 0 ${SIZE} ${SIZE}`}
				>
					{AXIS_TICKS.map((tick) => (
						<g key={tick}>
							<line
								className="stroke-border"
								x1={toX(tick)}
								x2={toX(tick)}
								y1={toY(0)}
								y2={toY(100)}
							/>
							<line
								className="stroke-border"
								x1={toX(0)}
								x2={toX(100)}
								y1={toY(tick)}
								y2={toY(tick)}
							/>
							<text
								className="fill-muted-foreground text-[10px]"
								textAnchor="middle"
								x={toX(tick)}
								y={toY(0) + 14}
							>
								{tick}
							</text>
							<text
								className="fill-muted-foreground text-[10px]"
								textAnchor="end"
								x={toX(0) - 6}
								y={toY(tick) + 3}
							>
								{tick}
							</text>
						</g>
					))}
					{points.map((point) => (
						<circle
							className="stroke-card"
							cx={toX(point.x)}
							cy={toY(point.y)}
							fill="var(--series-1)"
							key={point.id}
							r={5}
							strokeWidth={2}
						>
							<title>{`${point.name}: ${xName} ${formatPercent(point.x)}, ${yName} ${formatPercent(point.y)}`}</title>
						</circle>
					))}
				</svg>
				<p className="text-muted-foreground text-sm">
					{describeCorrelation(correlation)}
					{correlation !== null && ` · ${points.length} Bewerbende`}. Bei
					kleinen Gruppen nur als Hinweis lesen.
				</p>
			</CardContent>
		</Card>
	);
}

function TaskSelect({
	id,
	label,
	value,
	tasks,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	tasks: Props["tasks"];
	onChange: (taskId: string) => void;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			<NativeSelect
				id={id}
				onChange={(event) => onChange(event.target.value)}
				value={value}
			>
				{tasks.map((task) => (
					<NativeSelectOption key={task.id} value={task.id}>
						{task.name}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

export { TaskScatter };
