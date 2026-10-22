"use client";

import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { ROUTES } from "@/lib/routes";
import { MAX_COMPARED, MIN_COMPARED } from "../server/compare";
import type { EvaluationComparisonData } from "../server/get-evaluation-comparison-data";
import { seriesColor } from "./score-strip";

type Candidate = EvaluationComparisonData["candidates"][number];

function candidateLabel(candidate: Candidate): string {
	return candidate.rank === null
		? candidate.name
		: `${candidate.rank}. ${candidate.name}`;
}

/**
 * Swap, add or remove the people on the comparison page; every change is a
 * new URL, so the comparison stays shareable.
 */
function ComparisonPicker({
	acId,
	selectedIds,
	candidates,
}: {
	acId: string;
	selectedIds: string[];
	candidates: Candidate[];
}) {
	const router = useRouter();
	const show = (ids: string[]) =>
		router.push(ROUTES.acResultsCompare(acId, ids));
	const others = (exceptId?: string) =>
		candidates.filter(
			(candidate) =>
				candidate.id === exceptId || !selectedIds.includes(candidate.id),
		);

	return (
		<div
			className="flex flex-wrap items-end gap-3"
			data-testid="comparison-picker"
		>
			{selectedIds.map((id, index) => (
				<div className="flex items-center gap-1.5" key={id}>
					<span
						aria-hidden
						className="size-3 shrink-0 rounded-full"
						style={{ backgroundColor: seriesColor(index) }}
					/>
					<NativeSelect
						aria-label={`Person ${index + 1}`}
						onChange={(event) =>
							show(
								selectedIds.map((selected) =>
									selected === id ? event.target.value : selected,
								),
							)
						}
						value={id}
					>
						{others(id).map((candidate) => (
							<NativeSelectOption key={candidate.id} value={candidate.id}>
								{candidateLabel(candidate)}
							</NativeSelectOption>
						))}
					</NativeSelect>
					{selectedIds.length > MIN_COMPARED && (
						<Button
							aria-label={`Person ${index + 1} entfernen`}
							onClick={() =>
								show(selectedIds.filter((selected) => selected !== id))
							}
							size="icon-sm"
							variant="ghost"
						>
							<XIcon />
						</Button>
					)}
				</div>
			))}
			{selectedIds.length < MAX_COMPARED && (
				<NativeSelect
					aria-label="Person hinzufügen"
					onChange={(event) => {
						if (event.target.value) {
							show([...selectedIds, event.target.value]);
						}
					}}
					value=""
				>
					<NativeSelectOption value="">Person hinzufügen…</NativeSelectOption>
					{others().map((candidate) => (
						<NativeSelectOption key={candidate.id} value={candidate.id}>
							{candidateLabel(candidate)}
						</NativeSelectOption>
					))}
				</NativeSelect>
			)}
		</div>
	);
}

export { ComparisonPicker };
