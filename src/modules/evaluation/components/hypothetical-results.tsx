"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	formatOverallScore,
	formatPercent,
	formatSignedPoints,
} from "@/lib/format-percent";
import { ROUTES } from "@/lib/routes";
import type {
	HypotheticalResults as HypotheticalData,
	HypotheticalScore,
} from "../server/get-evaluation-results-data";

type Row = HypotheticalData["participants"][number];
type SortKey =
	| "actual"
	| "name"
	| "average"
	| "strictest"
	| "mildest"
	| "selected";
type Sort = { key: SortKey; descending: boolean };

/**
 * Best first by rank, A–Z by name; descending flips that. People without a
 * value come last either way, ties keep the real ranking.
 */
function sortRows(
	rows: Row[],
	sort: Sort,
	rankOf: (row: Row, key: SortKey) => number | null,
): Row[] {
	const direction = sort.descending ? -1 : 1;
	return [...rows].sort((left, right) => {
		if (sort.key === "name") {
			return direction * left.name.localeCompare(right.name, "de-DE");
		}
		const leftRank = rankOf(left, sort.key);
		const rightRank = rankOf(right, sort.key);
		if (leftRank === null || rightRank === null) {
			if (leftRank !== null) return -1;
			if (rightRank !== null) return 1;
		} else if (leftRank !== rightRank) {
			return direction * (leftRank - rightRank);
		}
		return (
			(left.actualRank ?? Number.MAX_SAFE_INTEGER) -
				(right.actualRank ?? Number.MAX_SAFE_INTEGER) ||
			left.name.localeCompare(right.name, "de-DE")
		);
	});
}

function SortIcon({ sort, sortKey }: { sort: Sort; sortKey: SortKey }) {
	if (sort.key !== sortKey) {
		return (
			<ArrowUpDownIcon aria-hidden className="size-3.5 shrink-0 opacity-40" />
		);
	}
	const Icon = sort.descending ? ArrowDownIcon : ArrowUpIcon;
	return <Icon aria-hidden className="size-3.5 shrink-0" />;
}

function ariaSort(sort: Sort, sortKey: SortKey) {
	if (sort.key !== sortKey) return undefined;
	return sort.descending ? "descending" : "ascending";
}

/** Column head that sorts the table; a second click flips the direction. */
function SortableHead({
	sortKey,
	sort,
	onSort,
	className,
	children,
}: {
	sortKey: SortKey;
	sort: Sort;
	onSort: (key: SortKey) => void;
	className?: string;
	children: ReactNode;
}) {
	return (
		<TableHead aria-sort={ariaSort(sort, sortKey)} className={className}>
			<button
				className="inline-flex items-center gap-1 text-left hover:text-foreground"
				onClick={() => onSort(sortKey)}
				type="button"
			>
				<span>{children}</span>
				<SortIcon sort={sort} sortKey={sortKey} />
			</button>
		</TableHead>
	);
}

/** Hypothetical score and rank, muted, next to the real result. */
function HypotheticalCell({
	value,
	actualRank,
}: {
	value: HypotheticalScore | undefined;
	actualRank: number | null;
}) {
	if (!value || value.score === null) {
		return <TableCell className="text-muted-foreground">–</TableCell>;
	}
	const rankShift =
		value.rank !== null && actualRank !== null ? actualRank - value.rank : 0;

	return (
		<TableCell className="text-muted-foreground text-sm tabular-nums">
			{formatPercent(value.score)}
			<span className="ml-1.5 text-xs">
				Rang {value.rank}
				{rankShift !== 0 && (
					<span className="ml-1">
						({rankShift > 0 ? "▲" : "▼"}
						{Math.abs(rankShift)})
					</span>
				)}
			</span>
		</TableCell>
	);
}

/**
 * Puts the real results into context: what the overall score and rank would
 * have been had one reviewer rated everyone. The real result stays first and
 * highlighted; the hypothetical columns only help to read it.
 */
function HypotheticalResults({
	acId,
	data,
}: {
	acId: string;
	data: HypotheticalData;
}) {
	const names = new Map(
		data.reviewers.map((reviewer) => [reviewer.reviewerId, reviewer]),
	);
	const strictest = data.strictestReviewerId
		? names.get(data.strictestReviewerId)
		: undefined;
	const mildest = data.mildestReviewerId
		? names.get(data.mildestReviewerId)
		: undefined;
	const [selectedId, setSelectedId] = useState(
		data.reviewers[0]?.reviewerId ?? "",
	);
	const [sort, setSort] = useState<Sort>({ key: "actual", descending: false });
	const onSort = (key: SortKey) =>
		setSort((current) => ({
			key,
			descending: current.key === key ? !current.descending : false,
		}));
	const scoreFor = (row: Row, key: SortKey): HypotheticalScore | undefined => {
		switch (key) {
			case "average":
				return row.averageReviewer;
			case "strictest":
				return data.strictestReviewerId
					? row.byReviewer[data.strictestReviewerId]
					: undefined;
			case "mildest":
				return data.mildestReviewerId
					? row.byReviewer[data.mildestReviewerId]
					: undefined;
			case "selected":
				return row.byReviewer[selectedId];
			default:
				return undefined;
		}
	};
	const rankOf = (row: Row, key: SortKey) =>
		key === "actual" ? row.actualRank : (scoreFor(row, key)?.rank ?? null);
	const rows = sortRows(data.participants, sort, rankOf);

	return (
		<Card data-testid="hypothetical-results">
			<CardHeader>
				<CardTitle>Einordnung der Ergebnisse</CardTitle>
				<CardDescription className="space-y-2">
					<span className="block">
						Maßgeblich sind die tatsächlichen Ergebnisse (Rang und Gesamtwert).
						Die grauen Spalten zeigen nur zur Einordnung, welchen Gesamtwert und
						Rang eine Person hypothetisch erhalten hätte, wenn ein einziger
						Bewerter alle bewertet hätte. Die Pfeile zeigen, wie viele Plätze
						sie dann besser (▲) oder schlechter (▼) läge.
					</span>
					<span className="block">
						Je Bewerter wird geschätzt, wie viele Prozentpunkte er über alle
						Aufgaben hinweg über oder unter dem durchschnittlichen Bewerter
						liegt; bei wenigen gemeinsamen Bewertungen wird der Wert Richtung 0
						gedämpft. Er ist daher kleiner als die Abweichung oben, die mit den
						anderen Bewertern vergleicht. Kritischster und mildester kommen nur
						aus Bewertern mit mindestens 3 Vergleichen. Weil ein Bewerter so
						alle gleich verschiebt, ist die Reihenfolge bei jedem einzelnen
						Bewerter praktisch dieselbe (Abweichungen nur an der 0- oder
						100-%-Grenze und bei Gleichstand im ganzen Prozent); sie weicht von
						der tatsächlichen ab, wo jemand vor allem von strengen oder milden
						Bewertern gesehen wurde.
					</span>
				</CardDescription>
			</CardHeader>
			<CardContent>
				{data.participants.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Noch keine Gesamtwerte zum Einordnen.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<SortableHead onSort={onSort} sort={sort} sortKey="actual">
									Rang
								</SortableHead>
								<SortableHead onSort={onSort} sort={sort} sortKey="name">
									Bewerbende
								</SortableHead>
								<SortableHead onSort={onSort} sort={sort} sortKey="actual">
									Gesamtwert
								</SortableHead>
								<SortableHead
									className="text-muted-foreground"
									onSort={onSort}
									sort={sort}
									sortKey="average"
								>
									Ø-Bewerter
								</SortableHead>
								<SortableHead
									className="text-muted-foreground"
									onSort={onSort}
									sort={sort}
									sortKey="strictest"
								>
									Kritischster
									{strictest && (
										<span className="block font-normal text-xs">
											{strictest.reviewerName} (
											{formatSignedPoints(strictest.effect)})
										</span>
									)}
								</SortableHead>
								<SortableHead
									className="text-muted-foreground"
									onSort={onSort}
									sort={sort}
									sortKey="mildest"
								>
									Mildester
									{mildest && (
										<span className="block font-normal text-xs">
											{mildest.reviewerName} (
											{formatSignedPoints(mildest.effect)})
										</span>
									)}
								</SortableHead>
								<TableHead
									aria-sort={ariaSort(sort, "selected")}
									className="text-muted-foreground"
								>
									<div className="flex items-center gap-1">
										<NativeSelect
											aria-label="Bewerter auswählen"
											onChange={(event) => setSelectedId(event.target.value)}
											size="sm"
											value={selectedId}
										>
											{data.reviewers.map((reviewer) => (
												<NativeSelectOption
													key={reviewer.reviewerId}
													value={reviewer.reviewerId}
												>
													{reviewer.reviewerName} (
													{formatSignedPoints(reviewer.effect)})
												</NativeSelectOption>
											))}
										</NativeSelect>
										<button
											aria-label="Nach ausgewähltem Bewerter sortieren"
											className="rounded-sm p-1 hover:text-foreground"
											onClick={() => onSort("selected")}
											type="button"
										>
											<SortIcon sort={sort} sortKey="selected" />
										</button>
									</div>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((participant) => (
								<TableRow key={participant.participantId}>
									<TableCell className="font-semibold tabular-nums">
										{participant.actualRank ?? "–"}
									</TableCell>
									<TableCell className="font-medium">
										<Link
											className="underline-offset-4 hover:underline"
											href={ROUTES.acResultsParticipant(
												acId,
												participant.participantId,
											)}
										>
											{participant.name}
										</Link>
									</TableCell>
									<TableCell className="font-semibold tabular-nums">
										{formatOverallScore(
											participant.actualScore,
											participant.actualShowsDecimal,
										)}
									</TableCell>
									<HypotheticalCell
										actualRank={participant.actualRank}
										value={participant.averageReviewer}
									/>
									<HypotheticalCell
										actualRank={participant.actualRank}
										value={
											data.strictestReviewerId
												? participant.byReviewer[data.strictestReviewerId]
												: undefined
										}
									/>
									<HypotheticalCell
										actualRank={participant.actualRank}
										value={
											data.mildestReviewerId
												? participant.byReviewer[data.mildestReviewerId]
												: undefined
										}
									/>
									<HypotheticalCell
										actualRank={participant.actualRank}
										value={participant.byReviewer[selectedId]}
									/>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

export { HypotheticalResults };
