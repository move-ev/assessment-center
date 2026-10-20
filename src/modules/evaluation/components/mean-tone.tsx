import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	AVERAGE_BAND_POINTS,
	type MeanComparison,
	type MeanTone,
	STRONG_DEVIATION_POINTS,
} from "../server/comparison";

/**
 * One look for "above / around / below the AC mean" across every chart:
 * green with ▲ is better, red with ▼ is worse, grey is average. The arrow
 * and sign carry the meaning too, so it never rests on colour alone.
 */
export const TONE: Record<
	MeanTone,
	{
		label: string;
		verdict: "Stärke" | "Im Schnitt" | "Schwäche";
		/** Filled surface with readable text, for cells and badges. */
		className: string;
		/** Solid colour for bars. */
		barColor: string;
		Icon: typeof ArrowUpIcon;
	}
> = {
	STRONG_ABOVE: {
		label: "deutlich über Ø",
		verdict: "Stärke",
		className: "bg-tone-strong-above text-tone-strong-above-foreground",
		barColor: "var(--tone-strong-above)",
		Icon: ArrowUpIcon,
	},
	ABOVE: {
		label: "über Ø",
		verdict: "Stärke",
		className: "bg-tone-above text-tone-above-foreground",
		barColor: "var(--tone-strong-above)",
		Icon: ArrowUpIcon,
	},
	AVERAGE: {
		label: "im Schnitt",
		verdict: "Im Schnitt",
		className: "bg-tone-average text-tone-average-foreground",
		barColor: "var(--muted-foreground)",
		Icon: MinusIcon,
	},
	BELOW: {
		label: "unter Ø",
		verdict: "Schwäche",
		className: "bg-tone-below text-tone-below-foreground",
		barColor: "var(--tone-strong-below)",
		Icon: ArrowDownIcon,
	},
	STRONG_BELOW: {
		label: "deutlich unter Ø",
		verdict: "Schwäche",
		className: "bg-tone-strong-below text-tone-strong-below-foreground",
		barColor: "var(--tone-strong-below)",
		Icon: ArrowDownIcon,
	},
};

/** Legend order, best first. */
export const TONE_ORDER: MeanTone[] = [
	"STRONG_ABOVE",
	"ABOVE",
	"AVERAGE",
	"BELOW",
	"STRONG_BELOW",
];

export function describeToneRange(tone: MeanTone): string {
	switch (tone) {
		case "STRONG_ABOVE":
			return `mehr als ${STRONG_DEVIATION_POINTS} Pkt. über Ø`;
		case "ABOVE":
			return `${AVERAGE_BAND_POINTS}–${STRONG_DEVIATION_POINTS} Pkt. über Ø`;
		case "AVERAGE":
			return `im Schnitt (± ${AVERAGE_BAND_POINTS} Pkt.)`;
		case "BELOW":
			return `${AVERAGE_BAND_POINTS}–${STRONG_DEVIATION_POINTS} Pkt. unter Ø`;
		case "STRONG_BELOW":
			return `mehr als ${STRONG_DEVIATION_POINTS} Pkt. unter Ø`;
	}
}

/**
 * Signed points with one decimal, e.g. "+12,5 Pkt." or "−6 Pkt.": whole
 * points would show 3.5 (above the ±3 band) as "+3".
 */
export function formatDelta(delta: number): string {
	const rounded = Math.round(delta * 10) / 10;
	const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
	return `${sign}${Math.abs(rounded).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Pkt.`;
}

/** Arrow, signed points and "über / unter Ø" on the tone's surface. */
export function ToneBadge({
	comparison,
	className,
}: {
	comparison: MeanComparison;
	className?: string;
}) {
	const tone = TONE[comparison.tone];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-xs tabular-nums",
				tone.className,
				className,
			)}
		>
			<tone.Icon aria-hidden className="size-3.5" />
			{comparison.tone === "AVERAGE"
				? `${formatDelta(comparison.delta)} · im Schnitt`
				: `${formatDelta(comparison.delta)} ${comparison.delta > 0 ? "über" : "unter"} Ø`}
		</span>
	);
}

export function ToneLegend() {
	return (
		<div className="flex flex-wrap gap-2">
			{TONE_ORDER.map((tone) => {
				const { className, Icon } = TONE[tone];
				return (
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
							className,
						)}
						key={tone}
					>
						<Icon aria-hidden className="size-3" />
						{describeToneRange(tone)}
					</span>
				);
			})}
		</div>
	);
}
