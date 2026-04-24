"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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

	return <AcDetailsFormContent ac={ac} acId={acId} utils={utils} />;
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

	const isReadOnly = ac.status === "COMPLETED";

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

	const zodErrors = updateMutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	return (
		<div className="max-w-xl space-y-8">
			<div>
				<h2 className="font-medium text-base">Details</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Name und Beschreibung des Assessment Centers.
				</p>
			</div>

			<form onSubmit={handleSave}>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="ac-name">Name</FieldLabel>
						<Input
							aria-invalid={!!zodErrors?.name?.length}
							disabled={isReadOnly || updateMutation.isPending}
							id="ac-name"
							onChange={(e) => setName(e.target.value)}
							required
							value={name}
						/>
						{zodErrors?.name && (
							<FieldError
								errors={zodErrors.name.map((m) => ({ message: m }))}
							/>
						)}
					</Field>

					<Field>
						<FieldLabel htmlFor="ac-description">
							Beschreibung{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</FieldLabel>
						<Textarea
							disabled={isReadOnly || updateMutation.isPending}
							id="ac-description"
							onChange={(e) => setDescription(e.target.value)}
							value={description}
						/>
					</Field>
				</FieldGroup>

				{!isReadOnly && (
					<div className="mt-6">
						<Button
							disabled={updateMutation.isPending || name.trim() === ""}
							type="submit"
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
				isAddingDay={addDayMutation.isPending}
				isReadOnly={isReadOnly}
				isRemovingDay={removeDayMutation.isPending}
				newDate={newDate}
				onAddDay={handleAddDay}
				onNewDateChange={setNewDate}
				onRemoveDay={(id) => removeDayMutation.mutate({ id })}
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
				<h3 className="font-medium text-sm">Tage</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					An welchen Tagen findet das Assessment Center statt?
				</p>
			</div>

			{days.length === 0 && (
				<p className="text-muted-foreground text-sm">
					Noch keine Tage hinzugefügt.
				</p>
			)}

			{days.length > 0 && (
				<ul className="space-y-2">
					{days.map((day) => (
						<li
							className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
							key={day.id}
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
									aria-label="Tag entfernen"
									disabled={isRemovingDay}
									onClick={() => onRemoveDay(day.id)}
									size="icon-sm"
									type="button"
									variant="ghost"
								>
									<Trash2Icon className="h-4 w-4" />
								</Button>
							)}
						</li>
					))}
				</ul>
			)}

			{!isReadOnly && (
				<form className="flex gap-2" onSubmit={onAddDay}>
					<Input
						aria-label="Neues Datum"
						className="w-auto"
						disabled={isAddingDay}
						onChange={(e) => onNewDateChange(e.target.value)}
						type="date"
						value={newDate}
					/>
					<Button
						disabled={isAddingDay || !newDate}
						type="submit"
						variant="outline"
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
	const router = useRouter();
	const { data: progress } = api.assessmentCenter.getSetupProgress.useQuery(
		{ acId },
		{ enabled: currentStatus === "DRAFT" },
	);

	const transitionMutation =
		api.assessmentCenter.transitionToActive.useMutation({
			onSuccess: async () => {
				await utils.assessmentCenter.getDetails.invalidate({ id: acId });
				router.refresh();
				toast.success("Assessment Center wurde aktiviert");
			},
			onError: (error) => toast.error(error.message),
		});
	const completeMutation =
		api.assessmentCenter.transitionToCompleted.useMutation({
			onSuccess: async () => {
				await utils.assessmentCenter.getDetails.invalidate({ id: acId });
				router.refresh();
				toast.success("Assessment Center wurde abgeschlossen");
			},
			onError: (error) => toast.error(error.message),
		});
	const reopenMutation = api.assessmentCenter.reopen.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			router.refresh();
			toast.success("Assessment Center wurde wieder geöffnet");
		},
		onError: (error) => toast.error(error.message),
	});

	const STATUS_LABEL: Record<AcStatus, string> = {
		DRAFT: "Entwurf",
		ACTIVE: "Aktiv",
		COMPLETED: "Abgeschlossen",
	};

	if (currentStatus === "COMPLETED") {
		return (
			<div className="space-y-4">
				<div>
					<h3 className="font-medium text-sm">Status</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						Das Assessment Center ist{" "}
						<strong className="text-foreground">
							{STATUS_LABEL[currentStatus]}
						</strong>
						. Du kannst es wieder öffnen, um Bewertungen nachzupflegen. Beim
						erneuten Abschließen werden die Auswertungen neu berechnet.
					</p>
				</div>
				<Button
					disabled={reopenMutation.isPending}
					onClick={() => reopenMutation.mutate({ id: acId })}
					variant="outline"
				>
					{reopenMutation.isPending ? "Öffne..." : "AC wieder öffnen"}
				</Button>
			</div>
		);
	}

	if (currentStatus === "ACTIVE") {
		return (
			<div className="space-y-4">
				<div>
					<h3 className="font-medium text-sm">Abschließen</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						Sobald das Assessment Center beendet ist, kann es abgeschlossen und
						in die Ergebnisse überführt werden.
					</p>
				</div>
				<Button
					disabled={completeMutation.isPending}
					onClick={() => completeMutation.mutate({ id: acId })}
				>
					{completeMutation.isPending
						? "Wird abgeschlossen..."
						: "AC abschließen"}
				</Button>
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
				<h3 className="font-medium text-sm">Aktivieren</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Sobald alle Einrichtungsschritte abgeschlossen sind, kann das AC
					aktiviert werden.
				</p>
			</div>
			<Button
				disabled={!allStepsComplete || transitionMutation.isPending}
				onClick={() => transitionMutation.mutate({ id: acId })}
			>
				{transitionMutation.isPending ? "Aktiviert..." : "AC aktivieren"}
			</Button>
			{!allStepsComplete && progress !== undefined && (
				<p className="text-muted-foreground text-sm">
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
