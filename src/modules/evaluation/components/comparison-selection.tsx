"use client";

import { ScaleIcon } from "lucide-react";
import Link from "next/link";
import { createContext, type ReactNode, useContext, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ROUTES } from "@/lib/routes";
import { MAX_COMPARED, MIN_COMPARED } from "../server/participant-comparison";

type Selection = {
	selectedIds: string[];
	toggle: (id: string) => void;
};

const SelectionContext = createContext<Selection | null>(null);

function useSelection(): Selection {
	const selection = useContext(SelectionContext);
	if (!selection) {
		throw new Error("CompareCheckbox must be inside ComparisonSelection");
	}
	return selection;
}

/**
 * Lets the ranking pick 2–3 people and open them side by side.
 */
function ComparisonSelection({
	acId,
	children,
}: {
	acId: string;
	children: ReactNode;
}) {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const toggle = (id: string) =>
		setSelectedIds((current) =>
			current.includes(id)
				? current.filter((selected) => selected !== id)
				: [...current, id],
		);
	const canCompare =
		selectedIds.length >= MIN_COMPARED && selectedIds.length <= MAX_COMPARED;

	return (
		<SelectionContext.Provider value={{ selectedIds, toggle }}>
			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2">
					<p className="text-muted-foreground text-sm">
						{selectedIds.length === 0
							? `${MIN_COMPARED}–${MAX_COMPARED} Bewerbende anhaken, um sie gegenüberzustellen.`
							: `${selectedIds.length} von höchstens ${MAX_COMPARED} ausgewählt`}
					</p>
					{canCompare ? (
						<Link
							className={buttonVariants({ size: "sm" })}
							href={ROUTES.acResultsCompare(acId, selectedIds)}
						>
							<ScaleIcon />
							Gegenüberstellen
						</Link>
					) : (
						<Button disabled size="sm">
							<ScaleIcon />
							Gegenüberstellen
						</Button>
					)}
				</div>
				{children}
			</div>
		</SelectionContext.Provider>
	);
}

function CompareCheckbox({
	participantId,
	name,
}: {
	participantId: string;
	name: string;
}) {
	const { selectedIds, toggle } = useSelection();
	const checked = selectedIds.includes(participantId);

	return (
		<Checkbox
			aria-label={`${name} gegenüberstellen`}
			checked={checked}
			disabled={!checked && selectedIds.length >= MAX_COMPARED}
			onCheckedChange={() => toggle(participantId)}
		/>
	);
}

export { CompareCheckbox, ComparisonSelection };
