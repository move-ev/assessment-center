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
	groupName: string | null;
	initialNotes: string;
};

function ReviewTeamObservation({
	acId,
	taskId,
	participantId,
	groupName,
	initialNotes,
}: Props) {
	const [notes, setNotes] = useState(initialNotes);
	const [saveState, setSaveState] = useState<
		"idle" | "saving" | "saved" | "error"
	>(initialNotes.trim() === "" ? "idle" : "saved");
	const mutation = api.rating.upsertTeamObservation.useMutation();
	const lastSaved = useRef(initialNotes.trim());
	const normalizedNotes = useMemo(() => notes.trim(), [notes]);

	useEffect(() => {
		if (normalizedNotes === lastSaved.current) {
			return;
		}

		setSaveState("saving");
		const timer = window.setTimeout(async () => {
			try {
				await mutation.mutateAsync({
					acId,
					taskId,
					participantId,
					notes: normalizedNotes,
				});
				lastSaved.current = normalizedNotes;
				setSaveState("saved");
			} catch (error) {
				setSaveState("error");
				toast.error(getErrorMessage(error));
			}
		}, 500);

		return () => window.clearTimeout(timer);
	}, [acId, mutation, normalizedNotes, participantId, taskId]);

	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle className="text-base">Teambeobachtung</CardTitle>
				<p className="text-muted-foreground text-sm">
					Optionaler Eindruck zur Gruppendynamik
					{groupName ? ` für ${groupName}` : ""}.
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				<Textarea
					onChange={(event) => setNotes(event.target.value)}
					placeholder="Zusammenspiel, Rollen und Dynamik der Gruppe"
					rows={5}
					value={notes}
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

	return "Optional. Leere Eingaben entfernen die Beobachtung.";
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Speichern fehlgeschlagen";
}

export { ReviewTeamObservation };
