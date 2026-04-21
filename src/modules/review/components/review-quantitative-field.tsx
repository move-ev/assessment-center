"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

	useEffect(() => {
		if (value === null) {
			return;
		}

		if (value === lastSavedValue.current) {
			return;
		}

		const currentValue = value;
		setSaveState("saving");
		const timer = window.setTimeout(async () => {
			try {
				await mutation.mutateAsync({
					acId,
					taskId,
					participantId,
					criteriaId: criterion.id,
					value: currentValue,
				});
				lastSavedValue.current = currentValue;
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
		taskId,
		value,
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
			<CardContent>
				<p className="text-muted-foreground text-xs">
					{value === null
						? "Wähle einen Wert von 0 bis 5."
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
