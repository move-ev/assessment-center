"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

type AcStatus = "DRAFT" | "ACTIVE" | "COMPLETED";

type AcData = {
	id: string;
	name: string;
	description: string | null;
	status: AcStatus;
	days: Array<{ id: string; date: Date }>;
};

type Props = {
	acId: string;
};

function AcDetailsForm({ acId }: Props) {
	const utils = api.useUtils();
	const { data: ac, isPending } = api.assessmentCenter.getDetails.useQuery({
		id: acId,
	});

	if (isPending) {
		return <AcDetailsFormSkeleton />;
	}

	if (!ac) {
		return null;
	}

	return <AcDetailsFormContent acId={acId} ac={ac} utils={utils} />;
}

type ContentProps = {
	acId: string;
	ac: AcData;
	utils: ReturnType<typeof api.useUtils>;
};

function AcDetailsFormContent({ acId, ac, utils }: ContentProps) {
	const [name, setName] = useState(ac.name);
	const [description, setDescription] = useState(ac.description ?? "");
	const [newDate, setNewDate] = useState("");

	const invalidateDetails = () =>
		utils.assessmentCenter.getDetails.invalidate({ id: acId });

	const isReadOnly = ac.status !== "DRAFT";

	const updateMutation = api.assessmentCenter.updateDetails.useMutation({
		onSuccess: async () => {
			await invalidateDetails();
			toast.success("Details gespeichert");
		},
		onError: (error) => toast.error(error.message),
	});

	const addDayMutation = api.assessmentCenter.addDay.useMutation({
		onSuccess: async () => {
			await invalidateDetails();
			setNewDate("");
			toast.success("Tag hinzugefügt");
		},
		onError: (error) => toast.error(error.message),
	});

	const removeDayMutation = api.assessmentCenter.removeDay.useMutation({
		onSuccess: async () => {
			await invalidateDetails();
			toast.success("Tag entfernt");
		},
		onError: (error) => toast.error(error.message),
	});

	function handleSave(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		updateMutation.mutate({
			id: acId,
			name,
			description: description.trim() !== "" ? description : undefined,
		});
	}

	function handleAddDay(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!newDate) return;
		addDayMutation.mutate({ acId, date: newDate });
	}

	const zodErrors = updateMutation.error?.data?.zodError
		?.fieldErrors as Record<string, string[]> | undefined;

	return (
		<div className="max-w-xl space-y-8">
			<div>
				<h2 className="text-base font-medium">Details</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Name und Beschreibung des Assessment Centers.
				</p>
			</div>

			<form onSubmit={handleSave}>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="ac-name">Name</FieldLabel>
						<Input
							id="ac-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isReadOnly || updateMutation.isPending}
							aria-invalid={!!zodErrors?.name?.length}
							required
						/>
						{zodErrors?.name && (
							<FieldError errors={zodErrors.name.map((m) => ({ message: m }))} />
						)}
					</Field>

					<Field>
						<FieldLabel htmlFor="ac-description">
							Beschreibung{" "}
							<span className="font-normal text-muted-foreground">(optional)</span>
						</FieldLabel>
						<Textarea
							id="ac-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isReadOnly || updateMutation.isPending}
						/>
					</Field>
				</FieldGroup>

				{!isReadOnly && (
					<div className="mt-6">
						<Button
							type="submit"
							disabled={updateMutation.isPending || name.trim() === ""}
						>
							{updateMutation.isPending ? "Speichert..." : "Speichern"}
						</Button>
					</div>
				)}
			</form>

			<Separator />

			<DaysSection
				acId={acId}
				days={ac.days}
				isReadOnly={isReadOnly}
				newDate={newDate}
				onNewDateChange={setNewDate}
				onAddDay={handleAddDay}
				onRemoveDay={(id) => removeDayMutation.mutate({ id })}
				isAddingDay={addDayMutation.isPending}
				isRemovingDay={removeDayMutation.isPending}
			/>

			<Separator />

			<StatusSection acId={acId} currentStatus={ac.status} utils={utils} />
		</div>
	);
}

type DaysSectionProps = {
	acId: string;
	days: Array<{ id: string; date: Date }>;
	isReadOnly: boolean;
	newDate: string;
	onNewDateChange: (v: string) => void;
	onAddDay: (e: React.FormEvent<HTMLFormElement>) => void;
	onRemoveDay: (id: string) => void;
	isAddingDay: boolean;
	isRemovingDay: boolean;
};

function DaysSection({
	days,
	isReadOnly,
	newDate,
	onNewDateChange,
	onAddDay,
	onRemoveDay,
	isAddingDay,
	isRemovingDay,
}: DaysSectionProps) {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-medium">Tage</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					An welchen Tagen findet das Assessment Center statt?
				</p>
			</div>

			{days.length === 0 && (
				<p className="text-sm text-muted-foreground">Noch keine Tage hinzugefügt.</p>
			)}

			{days.length > 0 && (
				<ul className="space-y-2">
					{days.map((day) => (
						<li
							key={day.id}
							className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
						>
							<span>
								{day.date.toLocaleDateString("de-DE", {
									weekday: "long",
									year: "numeric",
									month: "2-digit",
									day: "2-digit",
								})}
							</span>
							{!isReadOnly && (
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									disabled={isRemovingDay}
									onClick={() => onRemoveDay(day.id)}
									aria-label="Tag entfernen"
								>
									<Trash2Icon className="h-4 w-4" />
								</Button>
							)}
						</li>
					))}
				</ul>
			)}

			{!isReadOnly && (
				<form onSubmit={onAddDay} className="flex gap-2">
					<Input
						type="date"
						value={newDate}
						onChange={(e) => onNewDateChange(e.target.value)}
						disabled={isAddingDay}
						className="w-auto"
						aria-label="Neues Datum"
					/>
					<Button
						type="submit"
						variant="outline"
						disabled={isAddingDay || !newDate}
					>
						{isAddingDay ? "Hinzufügen..." : "Tag hinzufügen"}
					</Button>
				</form>
			)}
		</div>
	);
}

type StatusSectionProps = {
	acId: string;
	currentStatus: AcStatus;
	utils: ReturnType<typeof api.useUtils>;
};

function StatusSection({ acId, currentStatus, utils }: StatusSectionProps) {
	const { data: progress } = api.assessmentCenter.getSetupProgress.useQuery(
		{ acId },
		{ enabled: currentStatus === "DRAFT" },
	);

	const transitionMutation = api.assessmentCenter.transitionToActive.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			toast.success("Assessment Center wurde aktiviert");
		},
		onError: (error) => toast.error(error.message),
	});

	const STATUS_LABEL: Record<AcStatus, string> = {
		DRAFT: "Entwurf",
		ACTIVE: "Aktiv",
		COMPLETED: "Abgeschlossen",
	};

	if (currentStatus !== "DRAFT") {
		return (
			<div className="space-y-2">
				<h3 className="text-sm font-medium">Status</h3>
				<p className="text-sm text-muted-foreground">
					Das Assessment Center ist{" "}
					<strong className="text-foreground">{STATUS_LABEL[currentStatus]}</strong>{" "}
					und kann nicht mehr bearbeitet werden.
				</p>
			</div>
		);
	}

	const allStepsComplete =
		progress !== undefined &&
		progress.dayCount > 0 &&
		progress.participantCount > 0 &&
		progress.groupCount > 0 &&
		progress.taskCount > 0 &&
		progress.scheduleEntryCount > 0 &&
		progress.reviewerCount > 0 &&
		progress.assignmentCount > 0;

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-medium">Aktivieren</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Sobald alle Einrichtungsschritte abgeschlossen sind, kann das AC
					aktiviert werden.
				</p>
			</div>
			<Button
				onClick={() => transitionMutation.mutate({ id: acId })}
				disabled={!allStepsComplete || transitionMutation.isPending}
			>
				{transitionMutation.isPending ? "Aktiviert..." : "AC aktivieren"}
			</Button>
			{!allStepsComplete && progress !== undefined && (
				<p className="text-sm text-muted-foreground">
					Schließe alle 7 Einrichtungsschritte ab, um das AC zu aktivieren.
				</p>
			)}
		</div>
	);
}

function AcDetailsFormSkeleton() {
	return (
		<div className="max-w-xl space-y-4">
			<div className="h-5 w-24 animate-pulse rounded bg-muted" />
			<div className="h-9 w-full animate-pulse rounded bg-muted" />
			<div className="h-20 w-full animate-pulse rounded bg-muted" />
		</div>
	);
}

export { AcDetailsForm };
