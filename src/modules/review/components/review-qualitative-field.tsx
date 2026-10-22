"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
	// Text the server has confirmed, and the last text sent (or confirmed).
	const lastSaved = useRef(criterion.text.trim());
	const lastRequested = useRef(criterion.text.trim());
	// Saves run one after another, so the server always ends on the latest
	// text, even when the field is cleared while a save is still running.
	const saveQueue = useRef<Promise<void>>(Promise.resolve());
	const normalizedText = useMemo(() => text.trim(), [text]);

	useEffect(() => {
		onPersisted(criterion.id, normalizedText !== "");
	}, [criterion.id, normalizedText, onPersisted]);

	useEffect(() => {
		// An emptied field is saved too: it removes the entry.
		if (normalizedText === lastRequested.current) {
			// Typed and reverted before the save: nothing new to send.
			if (lastRequested.current === lastSaved.current) {
				setSaveState((state) => (state === "saving" ? "idle" : state));
			}
			return;
		}

		setSaveState("saving");
		const timer = window.setTimeout(() => {
			const textToSave = normalizedText;
			lastRequested.current = textToSave;
			saveQueue.current = saveQueue.current.then(async () => {
				const isLatest = () => lastRequested.current === textToSave;
				try {
					await mutation.mutateAsync({
						acId,
						taskId,
						participantId,
						criteriaId: criterion.id,
						text: textToSave,
					});
					lastSaved.current = textToSave;
					if (isLatest()) {
						setSaveState("saved");
						onPersisted(criterion.id, textToSave !== "");
					}
				} catch (error) {
					toast.error(getErrorMessage(error));
					if (isLatest()) {
						// Let the next edit send again.
						lastRequested.current = lastSaved.current;
						setSaveState("error");
					}
				}
			});
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
				<div className="flex flex-wrap items-start justify-between gap-3">
					<CardTitle className="text-base">{criterion.name}</CardTitle>
					<Badge variant="secondary">Freitext · optional</Badge>
				</div>
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
					{getSaveStateLabel(saveState)}
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
