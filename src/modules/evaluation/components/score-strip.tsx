import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Gridlines and labels of every 0–100 % score axis. */
export const AXIS_TICKS = [0, 25, 50, 75, 100] as const;

/** CSS position of a score on a 0–100 axis, clamped to the axis. */
export function axisPosition(score: number): string {
	return `${Math.min(100, Math.max(0, score))}%`;
}

/**
 * Categorical colour by fixed slot (reviewer or task order), never cycled:
 * past the eighth slot everything shares the muted "other" colour.
 */
export function seriesColor(index: number): string {
	return index < 8 ? `var(--series-${index + 1})` : "var(--muted-foreground)";
}

/** Recessive gridlines at the axis ticks, inside a relative container. */
export function StripGrid() {
	return AXIS_TICKS.map((tick) => (
		<span
			aria-hidden
			className="absolute inset-y-0 w-px bg-border"
			key={tick}
			style={{ left: axisPosition(tick) }}
		/>
	));
}

/**
 * A 0–100 % track with gridlines; marks are placed inside. The marks are
 * only visual, so the track reads out `label` instead.
 */
export function StripTrack({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<div aria-label={label} className="relative h-6" role="img">
			<StripGrid />
			{children}
		</div>
	);
}

/** Tick labels below a strip; the outer ones align to the track's edges. */
export function StripAxis({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn(
				"relative h-4 text-muted-foreground text-xs tabular-nums",
				className,
			)}
		>
			{AXIS_TICKS.map((tick) => (
				<span
					className={cn(
						"absolute whitespace-nowrap",
						tick === 0 && "translate-x-0",
						tick === 100 && "-translate-x-full",
						tick !== 0 && tick !== 100 && "-translate-x-1/2",
					)}
					key={tick}
					style={{ left: axisPosition(tick) }}
				>
					{tick} %
				</span>
			))}
		</div>
	);
}

/** A round mark on a strip, ringed in the card colour where marks overlap. */
export function StripDot({
	score,
	color,
	title,
	className,
	top = "50%",
}: {
	score: number;
	color: string;
	title: string;
	className?: string;
	top?: string;
}) {
	return (
		<span
			className={cn(
				"absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
				className,
			)}
			style={{ left: axisPosition(score), top, backgroundColor: color }}
			title={title}
		/>
	);
}

/** Thin vertical tick, e.g. for a mean. */
export function StripTick({
	score,
	title,
	className,
}: {
	score: number;
	title: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"absolute inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70",
				className,
			)}
			style={{ left: axisPosition(score) }}
			title={title}
		/>
	);
}

/** One entry of a chart legend: a swatch next to its name. */
export function LegendItem({
	color,
	label,
	shape = "dot",
}: {
	color: string;
	label: string;
	shape?: "dot" | "tick" | "band";
}) {
	return (
		<span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
			<span
				aria-hidden
				className={cn(
					shape === "dot" && "size-2.5 rounded-full",
					shape === "tick" && "h-3 w-0.5 rounded-full",
					shape === "band" && "h-2.5 w-4 rounded-sm",
				)}
				style={{ backgroundColor: color }}
			/>
			{label}
		</span>
	);
}
