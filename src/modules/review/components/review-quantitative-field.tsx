"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
		notes: string;
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
	const [notes, setNotes] = useState(criterion.notes);
	const [saveState, setSaveState] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const mutation = api.rating.upsertQuantitative.useMutation();
	const lastSaved = useRef({ value: criterion.value, notes: criterion.notes });
	const snapshot = useMemo(
		() => ({ value, notes: notes.trim() }),
		[notes, value],
	);

	useEffect(() => {
		if (snapshot.value === null) {
			return;
		}

		const currentValue = snapshot.value;

		if (
			currentValue === lastSaved.current.value &&
			snapshot.notes === lastSaved.current.notes
		) {
			return;
		}

		setSaveState("saving");
		const timer = window.setTimeout(async () => {
			try {
				await mutation.mutateAsync({
					acId,
					taskId,
					participantId,
					criteriaId: criterion.id,
					value: currentValue,
					notes: snapshot.notes === "" ? undefined : snapshot.notes,
				});
				lastSaved.current = { value: currentValue, notes: snapshot.notes };
				setSaveState("saved");
				onPersisted(criterion.id, true);
			} catch (error) {
				setSaveState("error");
				toast.error(getErrorMessage(error));
			}
		}, 500);

		return () => window.clearTimeout(timer);
	}, [
		acId,
		criterion.id,
		mutation,
		onPersisted,
		participantId,
		snapshot,
		taskId,
	]);

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
							onClick={() => setValue(rating)}
							type="button"
							variant="outline"
						>
							{rating}
						</Button>
					))}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<Textarea
					disabled={value === null}
					onChange={(event) => setNotes(event.target.value)}
					placeholder="Optionaler Kontext zur Bewertung"
					value={notes}
				/>
				<p className="text-muted-foreground text-xs">
					{value === null
						? "Wähle zuerst einen Wert von 0 bis 5."
						: getSaveStateLabel(saveState)}
				</p>
			</CardContent>
		</Card>
	);
}

const RATING_VALUES = [0, 1, 2, 3, 4, 5] as const;

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
