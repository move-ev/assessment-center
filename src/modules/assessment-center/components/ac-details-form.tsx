"use client";

import { Trash2Icon } from "lucide-react";
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
import { type AcStatus, isAcLocked } from "@/lib/ac-status";
import { api } from "@/trpc/react";
import { AcDemoField } from "./ac-demo-field";
import { AcLifecycleSections } from "./ac-lifecycle-sections";

type AcData = {
	id: string;
	name: string;
	description: string | null;
	status: AcStatus;
	isDemo: boolean;
	anonymizedAt: Date | null;
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

	const isReadOnly = isAcLocked(ac.status);

	const updateMutation = api.assessmentCenter.updateDetails.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			toast.success("Details gespeichert");
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

			<DemoSection acId={acId} isDemo={ac.isDemo} utils={utils} />

			<Separator />

			<DaysSection
				acId={acId}
				days={ac.days}
				isReadOnly={isReadOnly}
				utils={utils}
			/>

			<Separator />

			<AcLifecycleSections
				acId={acId}
				acName={ac.name}
				anonymizedAt={ac.anonymizedAt}
				status={ac.status}
				utils={utils}
			/>
		</div>
	);
}

type DaysSectionProps = {
	acId: string;
	days: Array<{ id: string; date: Date }>;
	isReadOnly: boolean;
	utils: ReturnType<typeof api.useUtils>;
};

function DaysSection({ acId, days, isReadOnly, utils }: DaysSectionProps) {
	const [newDate, setNewDate] = useState("");
	const invalidateDetails = () =>
		utils.assessmentCenter.getDetails.invalidate({ id: acId });

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

	function handleAddDay(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!newDate) return;
		addDayMutation.mutate({ acId, date: newDate });
	}

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
									disabled={removeDayMutation.isPending}
									onClick={() => removeDayMutation.mutate({ id: day.id })}
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
				<form className="flex gap-2" onSubmit={handleAddDay}>
					<Input
						aria-label="Neues Datum"
						className="w-auto"
						disabled={addDayMutation.isPending}
						onChange={(e) => setNewDate(e.target.value)}
						type="date"
						value={newDate}
					/>
					<Button
						disabled={addDayMutation.isPending || !newDate}
						type="submit"
						variant="outline"
					>
						{addDayMutation.isPending ? "Hinzufügen..." : "Tag hinzufügen"}
					</Button>
				</form>
			)}
		</div>
	);
}

type DemoSectionProps = {
	acId: string;
	isDemo: boolean;
	utils: ReturnType<typeof api.useUtils>;
};

/** Saves on toggle and works in every status, unlike the details form. */
function DemoSection({ acId, isDemo, utils }: DemoSectionProps) {
	const setDemoMutation = api.assessmentCenter.setDemo.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			await utils.assessmentCenter.listForUser.invalidate();
			toast.success("Demo-Markierung gespeichert");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<AcDemoField
			checked={isDemo}
			disabled={setDemoMutation.isPending}
			onCheckedChange={(checked) =>
				setDemoMutation.mutate({ id: acId, isDemo: checked })
			}
		/>
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
