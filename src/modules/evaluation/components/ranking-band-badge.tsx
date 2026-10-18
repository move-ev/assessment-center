import { Badge } from "@/components/ui/badge";
import { RANKING_BAND_PERCENT, type RankingBand } from "../server/ranking";

const RANKING_BAND_BADGE: Record<
	RankingBand,
	{ label: string; className: string }
> = {
	TOP: {
		label: `Top ${RANKING_BAND_PERCENT} %`,
		className:
			"border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
	},
	BOTTOM: {
		label: `Untere ${RANKING_BAND_PERCENT} %`,
		className:
			"border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
	},
};

function RankingBandBadge({ band }: { band: RankingBand }) {
	return (
		<Badge className={RANKING_BAND_BADGE[band].className} variant="outline">
			{RANKING_BAND_BADGE[band].label}
		</Badge>
	);
}

export { RankingBandBadge };
