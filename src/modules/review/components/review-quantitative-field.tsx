"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type Props = {
	acId: string;
	taskId: string;
	participantId: string;
	criterion: {
		id: string;
		name: string;
		description: string | null;
		weight: number;
		value: number | null;
	};
	onPersisted: (criterionId: string, isComplete: boolean) => void;
};

function ReviewQuantitativeField({
	acId,
	taskId,
	participantId,
	criterion,
	onPersisted,
}: Props) {
	const [value, setValue] = useState<number | null>(criterion.value);
	const [saveState, setSaveState] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const mutation = api.rating.upsertQuantitative.useMutation();
	const lastSavedValue = useRef(criterion.value);
	const saveTimer = useRef<number | null>(null);
	const [pendingExtreme, setPendingExtreme] = useState<1 | 5 | null>(null);

	const saveValue = useCallback(
		async (nextValue: number, { isRetry }: { isRetry: boolean }) => {
			if (!isRetry && nextValue === lastSavedValue.current) {
				return;
			}

			setSaveState("saving");
			try {
				await mutation.mutateAsync({
					acId,
					taskId,
					participantId,
					criteriaId: criterion.id,
					value: nextValue,
				});
				lastSavedValue.current = nextValue;
				setSaveState("saved");
				onPersisted(criterion.id, true);
			} catch (error) {
				setSaveState("error");
				toast.error(getErrorMessage(error));
			}
		},
		[acId, criterion.id, mutation, onPersisted, participantId, taskId],
	);

	useEffect(() => {
		return () => {
			if (saveTimer.current !== null) {
				window.clearTimeout(saveTimer.current);
				saveTimer.current = null;
			}
		};
	}, []);

	const commitSelection = useCallback(
		(nextValue: number) => {
			const isRetryWithSameValue =
				nextValue === value && saveState === "error";
			setValue(nextValue);

			if (saveTimer.current !== null) {
				window.clearTimeout(saveTimer.current);
			}

			saveTimer.current = window.setTimeout(() => {
				saveValue(nextValue, { isRetry: isRetryWithSameValue });
			}, 500);
		},
		[saveState, saveValue, value],
	);

	const handleRatingClick = useCallback(
		(rating: number) => {
			if (rating === 1 || rating === 5) {
				setPendingExtreme(rating);
				return;
			}
			commitSelection(rating);
		},
		[commitSelection],
	);

	return (
		<Card>
			<CardHeader className="gap-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<CardTitle className="text-base">{criterion.name}</CardTitle>
						{criterion.description && (
							<p className="text-muted-foreground text-sm">
								{criterion.description}
							</p>
						)}
					</div>
					<Badge variant="outline">Gewichtung {criterion.weight}</Badge>
				</div>
				<div className="flex flex-wrap gap-2">
					{RATING_VALUES.map((rating) => (
						<Button
							className={cn(
								"w-10",
								value === rating &&
									"border-primary bg-primary text-primary-foreground hover:bg-primary/90",
							)}
							key={rating}
							onClick={() => handleRatingClick(rating)}
							type="button"
							variant="outline"
						>
							{rating}
						</Button>
					))}
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-xs">
					{value === null
						? "Wähle einen Wert von 1 bis 5."
						: getSaveStateLabel(saveState)}
				</p>
			</CardContent>

			<Dialog
				onOpenChange={(nextOpen) => {
					if (!nextOpen) setPendingExtreme(null);
				}}
				open={pendingExtreme !== null}
			>
				<DialogContent
					className="gap-0 rounded-3xl p-0"
					showCloseButton={false}
					style={{ width: "26rem", maxWidth: "calc(100vw - 2rem)" }}
				>
					<div className="flex flex-col items-center gap-2.5 px-8 pt-10 pb-6 text-center">
						<DialogTitle className="font-heading text-lg">
							Bewertung {pendingExtreme} vergeben?
						</DialogTitle>
						<DialogDescription className="text-muted-foreground text-[13px] leading-relaxed">
							{pendingExtreme === 5
								? "Eine 5 steht für eine herausragende Leistung und sollte nur in Ausnahmefällen vergeben werden."
								: "Eine 1 steht für eine extrem schwache Leistung und sollte nur in Ausnahmefällen vergeben werden."}
						</DialogDescription>
					</div>
					<div className="flex gap-2 px-8 pb-8">
						<Button
							className="flex-1"
							onClick={() => setPendingExtreme(null)}
							type="button"
							variant="outline"
						>
							Abbrechen
						</Button>
						<Button
							className="flex-1"
							onClick={() => {
								if (pendingExtreme !== null) {
									commitSelection(pendingExtreme);
								}
								setPendingExtreme(null);
							}}
							type="button"
						>
							Übernehmen
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

function getSaveStateLabel(state: "idle" | "saving" | "saved" | "error") {
	if (state === "saving") {
		return "Speichert...";
	}

	if (state === "saved") {
		return "Automatisch gespeichert";
	}

	if (state === "error") {
		return "Speichern fehlgeschlagen";
	}

	return "Änderungen werden automatisch gespeichert";
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Speichern fehlgeschlagen";
}

export { ReviewQuantitativeField };
