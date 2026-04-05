"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type Props = {
	acId: string;
	taskId: string;
	participantId: string;
	criterion: {
		id: string;
		name: string;
		description: string | null;
		text: string;
	};
	onPersisted: (criterionId: string, isComplete: boolean) => void;
};

function ReviewQualitativeField({
	acId,
	taskId,
	participantId,
	criterion,
	onPersisted,
}: Props) {
	const [text, setText] = useState(criterion.text);
	const [saveState, setSaveState] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const mutation = api.rating.upsertQualitative.useMutation();
	const lastSaved = useRef(criterion.text.trim());
	const normalizedText = useMemo(() => text.trim(), [text]);

	useEffect(() => {
		onPersisted(criterion.id, normalizedText !== "");
	}, [criterion.id, normalizedText, onPersisted]);

	useEffect(() => {
		if (normalizedText === "" || normalizedText === lastSaved.current) {
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
					text: normalizedText,
				});
				lastSaved.current = normalizedText;
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
		normalizedText,
		onPersisted,
		participantId,
		taskId,
	]);

	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle className="text-base">{criterion.name}</CardTitle>
				{criterion.description && (
					<p className="text-muted-foreground text-sm">
						{criterion.description}
					</p>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				<Textarea
					onChange={(event) => setText(event.target.value)}
					placeholder="Beobachtung und Begründung eingeben"
					rows={6}
					value={text}
				/>
				<p className="text-muted-foreground text-xs">
					{normalizedText === ""
						? "Dieses Feld ist erforderlich."
						: getSaveStateLabel(saveState)}
				</p>
			</CardContent>
		</Card>
	);
}

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

export { ReviewQualitativeField };
