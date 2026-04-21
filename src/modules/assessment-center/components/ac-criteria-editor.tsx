"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { FormEvent, SelectHTMLAttributes } from "react";
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
type CriteriaGroupFactorType = "POTENTIAL" | "COMPETENCE";

type Criterion = {
	id: string;
	criteriaGroupId: string;
	name: string;
	description: string | null;
	type: CriteriaType;
	weight: number | null;
};

type CriteriaGroup = {
	id: string;
	title: string;
	factorType: CriteriaGroupFactorType;
	criteria: Criterion[];
};

type Props = {
	acId: string;
	taskId: string;
	criteriaGroups: CriteriaGroup[];
	utils: ReturnType<typeof api.useUtils>;
};

function AcCriteriaEditor({ acId, taskId, criteriaGroups, utils }: Props) {
	const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(
		null,
	);
	const [criterionGroupId, setCriterionGroupId] = useState<string | null>(null);
	const [editingGroup, setEditingGroup] = useState<CriteriaGroup | null>(null);
	const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);

	const invalidateTask = async () => {
		await utils.task.getById.invalidate({ id: taskId, acId });
		await utils.task.listByAc.invalidate({ acId });
	};

	const removeCriterionMutation = api.task.removeCriteria.useMutation({
		onSuccess: async () => {
			await invalidateTask();
			toast.success("Kriterium entfernt");
		},
		onError: (error) => toast.error(error.message),
	});

	const removeGroupMutation = api.task.removeCriteriaGroup.useMutation({
		onSuccess: async () => {
			await invalidateTask();
			toast.success("Kriteriengruppe entfernt");
		},
		onError: (error) => toast.error(error.message),
	});

	const hasGroups = criteriaGroups.length > 0;

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-medium text-sm">Bewertungskriterien</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Kriterien werden innerhalb von Gruppen mit Typ verwaltet.
				</p>
			</div>

			{hasGroups ? (
				<div className="space-y-4">
					{criteriaGroups.map((group) => (
						<CriteriaGroupCard
							group={group}
							isRemoving={removeCriterionMutation.isPending}
							isRemovingGroup={removeGroupMutation.isPending}
							key={group.id}
							onAddCriterion={() => setCriterionGroupId(group.id)}
							onEditCriterion={setEditingCriterion}
							onEditGroup={() => setEditingGroup(group)}
							onRemoveCriterion={(criterionId) =>
								removeCriterionMutation.mutate({
									id: criterionId,
									taskId,
									acId,
								})
							}
							onRemoveGroup={() =>
								removeGroupMutation.mutate({ id: group.id, taskId, acId })
							}
						/>
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-sm">
					Noch keine Kriteriengruppen hinzugefügt.
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				<Button
					onClick={() => setShowAddGroupDialog(true)}
					size="sm"
					type="button"
					variant="outline"
				>
					<PlusIcon className="mr-2 h-4 w-4" />
					Kriteriengruppe hinzufügen
				</Button>
				<Button
					disabled={!hasGroups}
					onClick={() => setCriterionGroupId(criteriaGroups[0]?.id ?? null)}
					size="sm"
					type="button"
					variant="outline"
				>
					<PlusIcon className="mr-2 h-4 w-4" />
					Kriterium hinzufügen
				</Button>
			</div>

			{showAddGroupDialog ? (
				<CriteriaGroupDialog
					acId={acId}
					onClose={() => setShowAddGroupDialog(false)}
					taskId={taskId}
					utils={utils}
				/>
			) : null}

			{editingGroup ? (
				<CriteriaGroupDialog
					acId={acId}
					group={editingGroup}
					onClose={() => setEditingGroup(null)}
					taskId={taskId}
					utils={utils}
				/>
			) : null}

			{criterionGroupId ? (
				<CriterionDialog
					acId={acId}
					criteriaGroups={criteriaGroups}
					initialGroupId={criterionGroupId}
					onClose={() => setCriterionGroupId(null)}
					taskId={taskId}
					utils={utils}
				/>
			) : null}

			{editingCriterion ? (
				<CriterionDialog
					acId={acId}
					criteria={editingCriterion}
					criteriaGroups={criteriaGroups}
					initialGroupId={editingCriterion.criteriaGroupId}
					onClose={() => setEditingCriterion(null)}
					taskId={taskId}
					utils={utils}
				/>
			) : null}
		</div>
	);
}

type CriteriaGroupCardProps = {
	group: CriteriaGroup;
	isRemoving: boolean;
	isRemovingGroup: boolean;
	onAddCriterion: () => void;
	onEditCriterion: (criterion: Criterion) => void;
	onEditGroup: () => void;
	onRemoveCriterion: (criterionId: string) => void;
	onRemoveGroup: () => void;
};

function CriteriaGroupCard({
	group,
	isRemoving,
	isRemovingGroup,
	onAddCriterion,
	onEditCriterion,
	onEditGroup,
	onRemoveCriterion,
	onRemoveGroup,
}: CriteriaGroupCardProps) {
	return (
		<div className="space-y-3 rounded-xl border bg-card p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<h4 className="font-medium text-sm">{group.title}</h4>
						<GroupFactorBadge factorType={group.factorType} />
						<Badge variant="outline">{group.criteria.length} Kriterien</Badge>
					</div>
					<p className="text-muted-foreground text-xs">
						{group.factorType === "POTENTIAL"
							? "Potenzial-Faktoren"
							: "Kompetenz-Faktoren"}
					</p>
				</div>
				<div className="flex shrink-0 gap-1">
					<Button
						aria-label="Gruppe bearbeiten"
						onClick={onEditGroup}
						size="icon-sm"
						variant="ghost"
					>
						<PencilIcon className="h-4 w-4" />
					</Button>
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button
									aria-label="Gruppe entfernen"
									disabled={isRemovingGroup}
									size="icon-sm"
									variant="ghost"
								>
									<Trash2Icon className="h-4 w-4" />
								</Button>
							}
						/>
						<AlertDialogContent size="sm">
							<AlertDialogHeader>
								<AlertDialogTitle>Kriteriengruppe entfernen?</AlertDialogTitle>
								<AlertDialogDescription>
									&ldquo;{group.title}&rdquo; und alle enthaltenen Kriterien
									werden dauerhaft entfernt.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Abbrechen</AlertDialogCancel>
								<AlertDialogAction
									onClick={onRemoveGroup}
									variant="destructive"
								>
									Entfernen
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			{group.criteria.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Noch keine Kriterien in dieser Gruppe.
				</p>
			) : (
				<ul className="space-y-2">
					{group.criteria.map((criterion) => (
						<CriterionRow
							criterion={criterion}
							isRemoving={isRemoving}
							key={criterion.id}
							onEdit={() => onEditCriterion(criterion)}
							onRemove={() => onRemoveCriterion(criterion.id)}
						/>
					))}
				</ul>
			)}

			<Button
				onClick={onAddCriterion}
				size="sm"
				type="button"
				variant="outline"
			>
				<PlusIcon className="mr-2 h-4 w-4" />
				Kriterium zu Gruppe hinzufügen
			</Button>
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
						{criterion.type === "QUANTITATIVE" ? "Quantitativ" : "Qualitativ"}
					</Badge>
					{criterion.weight !== null ? (
						<span className="text-muted-foreground text-xs">
							Gewicht: {criterion.weight}
						</span>
					) : null}
				</div>
				{criterion.description ? (
					<p className="mt-0.5 text-muted-foreground text-xs">
						{criterion.description}
					</p>
				) : null}
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

type CriteriaGroupDialogProps = {
	acId: string;
	taskId: string;
	utils: ReturnType<typeof api.useUtils>;
	onClose: () => void;
	group?: CriteriaGroup;
};

function CriteriaGroupDialog({
	acId,
	taskId,
	utils,
	onClose,
	group,
}: CriteriaGroupDialogProps) {
	const [title, setTitle] = useState(group?.title ?? "");
	const [factorType, setFactorType] = useState<CriteriaGroupFactorType>(
		group?.factorType ?? "COMPETENCE",
	);
	const isEditing = group !== undefined;

	const createMutation = api.task.addCriteriaGroup.useMutation({
		onSuccess: async () => {
			await utils.task.getById.invalidate({ id: taskId, acId });
			toast.success("Kriteriengruppe hinzugefügt");
			onClose();
		},
		onError: (error) => toast.error(error.message),
	});

	const updateMutation = api.task.updateCriteriaGroup.useMutation({
		onSuccess: async () => {
			await utils.task.getById.invalidate({ id: taskId, acId });
			toast.success("Kriteriengruppe aktualisiert");
			onClose();
		},
		onError: (error) => toast.error(error.message),
	});

	const mutation = isEditing ? updateMutation : createMutation;
	const zodErrors = mutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();

		if (isEditing) {
			updateMutation.mutate({
				id: group.id,
				taskId,
				acId,
				title,
				factorType,
			});
			return;
		}

		createMutation.mutate({
			taskId,
			acId,
			title,
			factorType,
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
					<DialogTitle>
						{isEditing
							? "Kriteriengruppe bearbeiten"
							: "Kriteriengruppe hinzufügen"}
					</DialogTitle>
				</DialogHeader>
				<form id="criteria-group-form" onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="criteria-group-title">Titel</FieldLabel>
							<Input
								disabled={mutation.isPending}
								id="criteria-group-title"
								onChange={(e) => setTitle(e.target.value)}
								required
								value={title}
							/>
							{zodErrors?.title ? (
								<FieldError
									errors={zodErrors.title.map((message) => ({ message }))}
								/>
							) : null}
						</Field>
						<Field>
							<FieldLabel htmlFor="criteria-group-factor-type">
								Gruppentyp
							</FieldLabel>
							<NativeSelect
								disabled={mutation.isPending}
								id="criteria-group-factor-type"
								onChange={(e) =>
									setFactorType(e.target.value as CriteriaGroupFactorType)
								}
								value={factorType}
							>
								<option value="COMPETENCE">Kompetenz-Faktoren</option>
								<option value="POTENTIAL">Potenzial-Faktoren</option>
							</NativeSelect>
						</Field>
					</FieldGroup>
				</form>
				<DialogFooter>
					<Button onClick={onClose} type="button" variant="outline">
						Abbrechen
					</Button>
					<Button
						disabled={mutation.isPending || title.trim() === ""}
						form="criteria-group-form"
						type="submit"
					>
						{mutation.isPending ? "Speichert..." : "Speichern"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type CriterionDialogProps = {
	acId: string;
	taskId: string;
	initialGroupId: string;
	criteriaGroups: CriteriaGroup[];
	utils: ReturnType<typeof api.useUtils>;
	onClose: () => void;
	criteria?: Criterion;
};

function CriterionDialog({
	acId,
	taskId,
	initialGroupId,
	criteriaGroups,
	utils,
	onClose,
	criteria,
}: CriterionDialogProps) {
	const [criteriaGroupId, setCriteriaGroupId] = useState(initialGroupId);
	const [name, setName] = useState(criteria?.name ?? "");
	const [description, setDescription] = useState(criteria?.description ?? "");
	const [type, setType] = useState<CriteriaType>(
		criteria?.type ?? "QUANTITATIVE",
	);
	const [weight, setWeight] = useState(criteria?.weight?.toString() ?? "");
	const isEditing = criteria !== undefined;

	const createMutation = api.task.addCriteria.useMutation({
		onSuccess: async () => {
			await utils.task.getById.invalidate({ id: taskId, acId });
			await utils.task.listByAc.invalidate({ acId });
			toast.success("Kriterium hinzugefügt");
			onClose();
		},
		onError: (error) => toast.error(error.message),
	});

	const updateMutation = api.task.updateCriteria.useMutation({
		onSuccess: async () => {
			await utils.task.getById.invalidate({ id: taskId, acId });
			await utils.task.listByAc.invalidate({ acId });
			toast.success("Kriterium aktualisiert");
			onClose();
		},
		onError: (error) => toast.error(error.message),
	});

	const mutation = isEditing ? updateMutation : createMutation;
	const zodErrors = mutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const parsedWeight = Number.parseFloat(weight);
		const normalizedWeight =
			type === "QUANTITATIVE" && !Number.isNaN(parsedWeight)
				? parsedWeight
				: undefined;

		if (isEditing) {
			updateMutation.mutate({
				id: criteria.id,
				taskId,
				acId,
				criteriaGroupId,
				name,
				description: description.trim() !== "" ? description : undefined,
				type,
				weight: normalizedWeight,
			});
			return;
		}

		createMutation.mutate({
			taskId,
			acId,
			criteriaGroupId,
			name,
			description: description.trim() !== "" ? description : undefined,
			type,
			weight: normalizedWeight,
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
					<DialogTitle>
						{isEditing ? "Kriterium bearbeiten" : "Kriterium hinzufügen"}
					</DialogTitle>
				</DialogHeader>
				<form id="criterion-form" onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="criteria-group">Gruppe</FieldLabel>
							<NativeSelect
								disabled={mutation.isPending}
								id="criteria-group"
								onChange={(e) => setCriteriaGroupId(e.target.value)}
								value={criteriaGroupId}
							>
								{criteriaGroups.map((group) => (
									<option key={group.id} value={group.id}>
										{group.title} ({getFactorTypeLabel(group.factorType)})
									</option>
								))}
							</NativeSelect>
						</Field>
						<Field>
							<FieldLabel htmlFor="criteria-name">Name</FieldLabel>
							<Input
								disabled={mutation.isPending}
								id="criteria-name"
								onChange={(e) => setName(e.target.value)}
								required
								value={name}
							/>
							{zodErrors?.name ? (
								<FieldError
									errors={zodErrors.name.map((message) => ({ message }))}
								/>
							) : null}
						</Field>
						<Field>
							<FieldLabel htmlFor="criteria-description">
								Beschreibung{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</FieldLabel>
							<Input
								disabled={mutation.isPending}
								id="criteria-description"
								onChange={(e) => setDescription(e.target.value)}
								value={description}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="criteria-type">Typ</FieldLabel>
							<NativeSelect
								disabled={mutation.isPending}
								id="criteria-type"
								onChange={(e) => setType(e.target.value as CriteriaType)}
								value={type}
							>
								<option value="QUANTITATIVE">Quantitativ (0-5 Skala)</option>
								<option value="QUALITATIVE">Qualitativ (Freitext)</option>
							</NativeSelect>
						</Field>
						{type === "QUANTITATIVE" ? (
							<Field>
								<FieldLabel htmlFor="criteria-weight">Gewichtung</FieldLabel>
								<Input
									disabled={mutation.isPending}
									id="criteria-weight"
									min="0.01"
									onChange={(e) => setWeight(e.target.value)}
									required
									step="0.01"
									type="number"
									value={weight}
								/>
							</Field>
						) : null}
					</FieldGroup>
				</form>
				<DialogFooter>
					<Button onClick={onClose} type="button" variant="outline">
						Abbrechen
					</Button>
					<Button
						disabled={mutation.isPending || name.trim() === ""}
						form="criterion-form"
						type="submit"
					>
						{mutation.isPending ? "Speichert..." : "Speichern"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function GroupFactorBadge({
	factorType,
}: {
	factorType: CriteriaGroupFactorType;
}) {
	return (
		<Badge variant={factorType === "POTENTIAL" ? "secondary" : "outline"}>
			{getFactorTypeLabel(factorType)}
		</Badge>
	);
}

function NativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			{...props}
			className="block w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
		/>
	);
}

function getFactorTypeLabel(factorType: CriteriaGroupFactorType) {
	return factorType === "POTENTIAL" ? "Potenzial" : "Kompetenz";
}

export { AcCriteriaEditor };
