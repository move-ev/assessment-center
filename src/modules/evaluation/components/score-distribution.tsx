import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatOverallScore, formatPercent } from "@/lib/format-percent";
import { ROUTES } from "@/lib/routes";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";
import { RANKING_BAND_PERCENT, type RankingBand } from "../server/ranking";
import { stackDots } from "./chart-scales";
import {
	axisPosition,
	LegendItem,
	StripAxis,
	StripGrid,
	StripTick,
	TICK_COLOR,
} from "./score-strip";

/** Dots closer than this (in percentage points) stack. */
const DOT_GAP = 2.5;
const ROW_HEIGHT_PX = 16;

/** Status good and critical, as the green and red ranking-band badges. */
const BAND_COLOR: Record<RankingBand | "NONE", string> = {
	TOP: "#0ca30c",
	BOTTOM: "#d03b3b",
	NONE: "var(--series-1)",
};

/**
 * Every participant's overall score as one dot on a 0–100 % axis, coloured
 * by ranking band: shows clear gaps or a dense middle at a glance.
 */
function ScoreDistribution({
	acId,
	participants,
	averageScore,
}: {
	acId: string;
	participants: EvaluationResultsData["participants"];
	averageScore: number | null;
}) {
	const scored = participants.flatMap((participant) =>
		participant.overallScore === null || participant.rank === null
			? []
			: [
					{
						participant,
						rank: participant.rank,
						score: participant.overallScore,
					},
				],
	);

	if (scored.length === 0) {
		return null;
	}

	const rows = stackDots(
		scored.map((entry) => entry.score),
		DOT_GAP,
	);
	const rowCount = Math.max(...rows) + 1;

	return (
		<Card data-testid="score-distribution">
			<CardHeader>
				<CardTitle>Verteilung der Gesamtwerte</CardTitle>
				<CardDescription>
					Jeder Punkt ist eine Bewerbende; nahe beieinander liegende Werte
					stapeln sich.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Not a StripTrack: the dots are links and must stay reachable. */}
				<div
					className="relative"
					style={{ height: rowCount * ROW_HEIGHT_PX + 8 }}
				>
					<StripGrid />
					{averageScore !== null && (
						<StripTick
							score={averageScore}
							title={`Durchschnitt ${formatPercent(averageScore)}`}
						/>
					)}
					{scored.map((entry, index) => (
						<Link
							aria-label={`${entry.participant.name}: ${formatOverallScore(entry.score, entry.participant.showsDecimal)}, Rang ${entry.rank}`}
							className="absolute flex size-4 -translate-x-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
							href={ROUTES.acResultsParticipant(acId, entry.participant.id)}
							key={entry.participant.id}
							style={{
								left: axisPosition(entry.score),
								bottom: 4 + (rows[index] ?? 0) * ROW_HEIGHT_PX,
							}}
							title={`${entry.participant.name}: ${formatOverallScore(entry.score, entry.participant.showsDecimal)} · Rang ${entry.rank}`}
						>
							<span
								className="size-3 rounded-full ring-2 ring-card"
								style={{
									backgroundColor:
										BAND_COLOR[entry.participant.rankingBand ?? "NONE"],
								}}
							/>
						</Link>
					))}
				</div>
				<StripAxis />
				<div className="flex flex-wrap gap-4">
					<LegendItem
						color={BAND_COLOR.TOP}
						label={`Top ${RANKING_BAND_PERCENT} %`}
					/>
					<LegendItem color={BAND_COLOR.NONE} label="Mittelfeld" />
					<LegendItem
						color={BAND_COLOR.BOTTOM}
						label={`Untere ${RANKING_BAND_PERCENT} %`}
					/>
					{averageScore !== null && (
						<LegendItem
							color={TICK_COLOR}
							label={`Durchschnitt ${formatPercent(averageScore)}`}
							shape="tick"
						/>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export { ScoreDistribution };
