"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

type CriteriaType = "QUANTITATIVE" | "QUALITATIVE";

type Criterion = {
	id: string;
	name: string;
	description: string | null;
	type: CriteriaType;
	weight: number | null;
};

type Props = {
	acId: string;
	taskId: string;
	criteria: Criterion[];
	utils: ReturnType<typeof api.useUtils>;
};

function AcCriteriaEditor({ acId, taskId, criteria, utils }: Props) {
	const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(
		null,
	);
	const [showAddForm, setShowAddForm] = useState(false);

	const invalidate = () => utils.task.getById.invalidate({ id: taskId, acId });

	const removeMutation = api.task.removeCriteria.useMutation({
		onSuccess: async () => {
			await invalidate();
			toast.success("Kriterium entfernt");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-medium text-sm">Bewertungskriterien</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Kriterien, nach denen Teilnehmer bewertet werden.
				</p>
			</div>

			{criteria.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Noch keine Kriterien hinzugefügt.
				</p>
			) : (
				<ul className="space-y-2">
					{criteria.map((c) => (
						<CriterionRow
							criterion={c}
							isRemoving={removeMutation.isPending}
							key={c.id}
							onEdit={() => setEditingCriterion(c)}
							onRemove={() => removeMutation.mutate({ id: c.id, taskId, acId })}
						/>
					))}
				</ul>
			)}

			{showAddForm ? (
				<CriterionForm
					acId={acId}
					onClose={() => setShowAddForm(false)}
					taskId={taskId}
					utils={utils}
				/>
			) : (
				<Button
					onClick={() => setShowAddForm(true)}
					size="sm"
					type="button"
					variant="outline"
				>
					<PlusIcon className="mr-2 h-4 w-4" />
					Kriterium hinzufügen
				</Button>
			)}

			{editingCriterion && (
				<CriterionEditDialog
					acId={acId}
					criterion={editingCriterion}
					onClose={() => setEditingCriterion(null)}
					taskId={taskId}
					utils={utils}
				/>
			)}
		</div>
	);
}

type CriterionRowProps = {
	criterion: Criterion;
	onEdit: () => void;
	onRemove: () => void;
	isRemoving: boolean;
};

function CriterionRow({
	criterion,
	onEdit,
	onRemove,
	isRemoving,
}: CriterionRowProps) {
	const typeLabel =
		criterion.type === "QUANTITATIVE" ? "Quantitativ" : "Qualitativ";

	return (
		<li className="flex items-start justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="font-medium text-sm">{criterion.name}</span>
					<Badge
						variant={
							criterion.type === "QUANTITATIVE" ? "default" : "secondary"
						}
					>
						{typeLabel}
					</Badge>
					{criterion.weight !== null && (
						<span className="text-muted-foreground text-xs">
							Gewicht: {criterion.weight}
						</span>
					)}
				</div>
				{criterion.description && (
					<p className="mt-0.5 text-muted-foreground text-xs">
						{criterion.description}
					</p>
				)}
			</div>
			<div className="flex shrink-0 gap-1">
				<Button
					aria-label="Kriterium bearbeiten"
					onClick={onEdit}
					size="icon-sm"
					variant="ghost"
				>
					<PencilIcon className="h-4 w-4" />
				</Button>
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button
								aria-label="Kriterium entfernen"
								disabled={isRemoving}
								size="icon-sm"
								variant="ghost"
							>
								<Trash2Icon className="h-4 w-4" />
							</Button>
						}
					/>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogTitle>Kriterium entfernen?</AlertDialogTitle>
							<AlertDialogDescription>
								&ldquo;{criterion.name}&rdquo; wird dauerhaft entfernt.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Abbrechen</AlertDialogCancel>
							<AlertDialogAction onClick={onRemove} variant="destructive">
								Entfernen
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</li>
	);
}

type CriterionFormProps = {
	acId: string;
	taskId: string;
	utils: ReturnType<typeof api.useUtils>;
	onClose: () => void;
};

function CriterionForm({ acId, taskId, utils, onClose }: CriterionFormProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState<CriteriaType>("QUANTITATIVE");
	const [weight, setWeight] = useState("");

	const createMutation = api.task.addCriteria.useMutation({
		onSuccess: async () => {
			await utils.task.getById.invalidate({ id: taskId, acId });
			toast.success("Kriterium hinzugefügt");
			onClose();
		},
		onError: (error) => toast.error(error.message),
	});

	const zodErrors = createMutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const parsedWeight = parseFloat(weight);
		createMutation.mutate({
			taskId,
			acId,
			name,
			description: description.trim() !== "" ? description : undefined,
			type,
			weight:
				type === "QUANTITATIVE" && !Number.isNaN(parsedWeight)
					? parsedWeight
					: undefined,
		});
	}

	return (
		<form className="rounded-lg border bg-muted/30 p-4" onSubmit={handleSubmit}>
			<p className="mb-4 font-medium text-sm">Neues Kriterium</p>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="criteria-name">Name</FieldLabel>
					<Input
						disabled={createMutation.isPending}
						id="criteria-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="z. B. Kommunikation"
						required
						value={name}
					/>
					{zodErrors?.name && (
						<FieldError errors={zodErrors.name.map((m) => ({ message: m }))} />
					)}
				</Field>
				<Field>
					<FieldLabel htmlFor="criteria-description">
						Beschreibung{" "}
						<span className="font-normal text-muted-foreground">
							(optional)
						</span>
					</FieldLabel>
					<Input
						disabled={createMutation.isPending}
						id="criteria-description"
						onChange={(e) => setDescription(e.target.value)}
						value={description}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="criteria-type">Typ</FieldLabel>
					<select
						className="block w-full max-w-xs rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						disabled={createMutation.isPending}
						id="criteria-type"
						onChange={(e) => setType(e.target.value as CriteriaType)}
						value={type}
					>
						<option value="QUANTITATIVE">Quantitativ (0–5 Skala)</option>
						<option value="QUALITATIVE">Qualitativ (Freitext)</option>
					</select>
				</Field>
				{type === "QUANTITATIVE" && (
					<Field>
						<FieldLabel htmlFor="criteria-weight">Gewichtung</FieldLabel>
						<Input
							className="max-w-xs"
							disabled={createMutation.isPending}
							id="criteria-weight"
							min="0.01"
							onChange={(e) => setWeight(e.target.value)}
							placeholder="z. B. 1.0"
							required
							step="0.01"
							type="number"
							value={weight}
						/>
					</Field>
				)}
			</FieldGroup>
			<div className="mt-4 flex gap-2">
				<Button
					disabled={createMutation.isPending || name.trim() === ""}
					type="submit"
				>
					{createMutation.isPending ? "Hinzufügen..." : "Hinzufügen"}
				</Button>
				<Button onClick={onClose} type="button" variant="ghost">
					Abbrechen
				</Button>
			</div>
		</form>
	);
}

type CriterionEditDialogProps = {
	criterion: Criterion;
	acId: string;
	taskId: string;
	utils: ReturnType<typeof api.useUtils>;
	onClose: () => void;
};

function CriterionEditDialog({
	criterion,
	acId,
	taskId,
	utils,
	onClose,
}: CriterionEditDialogProps) {
	const [name, setName] = useState(criterion.name);
	const [description, setDescription] = useState(criterion.description ?? "");
	const [type, setType] = useState<CriteriaType>(criterion.type);
	const [weight, setWeight] = useState(criterion.weight?.toString() ?? "");

	const updateMutation = api.task.updateCriteria.useMutation({
		onSuccess: async () => {
			await utils.task.getById.invalidate({ id: taskId, acId });
			toast.success("Kriterium aktualisiert");
			onClose();
		},
		onError: (error) => toast.error(error.message),
	});

	const zodErrors = updateMutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const parsedWeight = parseFloat(weight);
		updateMutation.mutate({
			id: criterion.id,
			taskId,
			acId,
			name,
			description: description.trim() !== "" ? description : undefined,
			type,
			weight:
				type === "QUANTITATIVE" && !Number.isNaN(parsedWeight)
					? parsedWeight
					: undefined,
		});
	}

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Kriterium bearbeiten</DialogTitle>
				</DialogHeader>
				<form id="edit-criterion-form" onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="edit-criteria-name">Name</FieldLabel>
							<Input
								disabled={updateMutation.isPending}
								id="edit-criteria-name"
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
							<FieldLabel htmlFor="edit-criteria-description">
								Beschreibung{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</FieldLabel>
							<Input
								disabled={updateMutation.isPending}
								id="edit-criteria-description"
								onChange={(e) => setDescription(e.target.value)}
								value={description}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="edit-criteria-type">Typ</FieldLabel>
							<select
								className="block w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								disabled={updateMutation.isPending}
								id="edit-criteria-type"
								onChange={(e) => setType(e.target.value as CriteriaType)}
								value={type}
							>
								<option value="QUANTITATIVE">Quantitativ (0–5 Skala)</option>
								<option value="QUALITATIVE">Qualitativ (Freitext)</option>
							</select>
						</Field>
						{type === "QUANTITATIVE" && (
							<Field>
								<FieldLabel htmlFor="edit-criteria-weight">
									Gewichtung
								</FieldLabel>
								<Input
									disabled={updateMutation.isPending}
									id="edit-criteria-weight"
									min="0.01"
									onChange={(e) => setWeight(e.target.value)}
									required
									step="0.01"
									type="number"
									value={weight}
								/>
							</Field>
						)}
					</FieldGroup>
				</form>
				<DialogFooter>
					<Button onClick={onClose} type="button" variant="outline">
						Abbrechen
					</Button>
					<Button
						disabled={updateMutation.isPending || name.trim() === ""}
						form="edit-criterion-form"
						type="submit"
					>
						{updateMutation.isPending ? "Speichert..." : "Speichern"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { AcCriteriaEditor };
