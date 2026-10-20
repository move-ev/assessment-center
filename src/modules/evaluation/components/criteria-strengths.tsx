import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatPercent } from "@/lib/format-percent";
import {
	compareToMean,
	pickStrengthsAndWeaknesses,
} from "../server/comparison";
import type { CriterionComparison } from "../server/get-evaluation-participant-detail-data";
import { ToneBadge } from "./mean-tone";

const SHOWN_PER_SIDE = 3;

function CriterionList({
	title,
	Icon,
	items,
	emptyText,
}: {
	title: string;
	Icon: typeof ThumbsUpIcon;
	items: CriterionComparison[];
	emptyText: string;
}) {
	return (
		<div className="space-y-3">
			<p className="flex items-center gap-2 font-medium text-sm">
				<Icon aria-hidden className="size-4 text-muted-foreground" />
				{title}
			</p>
			{items.length === 0 ? (
				<p className="text-muted-foreground text-sm">{emptyText}</p>
			) : (
				<ul className="space-y-2">
					{items.map((item) => {
						const comparison = compareToMean(
							item.personPercent,
							item.acPercent,
						);
						return (
							<li
								className="flex items-start justify-between gap-3 rounded-lg border p-3"
								key={item.criteriaId}
							>
								<div className="min-w-0">
									<p className="font-medium text-sm">{item.name}</p>
									<p className="text-muted-foreground text-xs">
										{item.taskName} · {item.criteriaGroupTitle} ·{" "}
										{formatPercent(item.personPercent)} statt Ø{" "}
										{formatPercent(item.acPercent)}
									</p>
								</div>
								{comparison && (
									<ToneBadge className="shrink-0" comparison={comparison} />
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

/**
 * The criteria where the person stood out most from the AC, both ways, so
 * one sees what a task score is made of without reading every row.
 */
function CriteriaStrengths({ criteria }: { criteria: CriterionComparison[] }) {
	if (criteria.length === 0) {
		return null;
	}

	const { strengths, weaknesses } = pickStrengthsAndWeaknesses(
		criteria,
		SHOWN_PER_SIDE,
	);

	return (
		<Card data-testid="criteria-strengths">
			<CardHeader>
				<CardTitle>Stärken und Schwächen nach Kriterium</CardTitle>
				<CardDescription>
					Die Kriterien mit dem größten Abstand zum Durchschnitt im AC, in
					Prozent der Skala.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-6 md:grid-cols-2">
				<CriterionList
					emptyText="Kein Kriterium deutlich über dem Durchschnitt."
					Icon={ThumbsUpIcon}
					items={strengths}
					title="Stärken"
				/>
				<CriterionList
					emptyText="Kein Kriterium deutlich unter dem Durchschnitt."
					Icon={ThumbsDownIcon}
					items={weaknesses}
					title="Schwächen"
				/>
			</CardContent>
		</Card>
	);
}

export { CriteriaStrengths };
