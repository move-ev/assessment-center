"use client";

import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

type Participant = { id: string; name: string };
type Member = { participantId: string; participant: Participant };
type Group = { id: string; name: string; memberships: Member[] };

type Props = {
	acId: string;
};

function AcGroupsEditor({ acId }: Props) {
	const utils = api.useUtils();
	const { data: groups = [], isPending: groupsLoading } =
		api.group.listByAc.useQuery({ acId });
	const { data: participants = [], isPending: participantsLoading } =
		api.participant.listByAc.useQuery({ acId });

	const invalidateGroups = () => utils.group.listByAc.invalidate({ acId });

	const createGroupMutation = api.group.create.useMutation({
		onSuccess: async () => {
			await invalidateGroups();
			toast.success("Gruppe erstellt");
		},
		onError: (error) => toast.error(error.message),
	});

	const removeGroupMutation = api.group.remove.useMutation({
		onSuccess: async () => {
			await invalidateGroups();
			toast.success("Gruppe gelöscht");
		},
		onError: (error) => toast.error(error.message),
	});

	const assignMutation = api.group.assignParticipant.useMutation({
		onSuccess: async () => {
			await invalidateGroups();
		},
		onError: (error) => toast.error(error.message),
	});

	const unassignMutation = api.group.unassignParticipant.useMutation({
		onSuccess: async () => {
			await invalidateGroups();
		},
		onError: (error) => toast.error(error.message),
	});

	const isPending = groupsLoading || participantsLoading;

	if (isPending) {
		return <GroupsEditorSkeleton />;
	}

	const assignedParticipantIds = new Set(
		groups.flatMap((g) => g.memberships.map((m) => m.participantId)),
	);

	const unassignedParticipants = participants.filter(
		(p) => !assignedParticipantIds.has(p.id),
	);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-medium text-base">Gruppen</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Bewerbende in Gruppen einteilen. Jede/r Bewerbende gehört genau einer
					Gruppe an.
				</p>
			</div>

			{groups.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Noch keine Gruppen erstellt.
				</p>
			) : (
				<div className="space-y-4">
					{groups.map((group) => {
						const availableForGroup = participants.filter(
							(p) =>
								!assignedParticipantIds.has(p.id) ||
								group.memberships.some((m) => m.participantId === p.id),
						);

						return (
							<GroupCard
								availableParticipants={availableForGroup}
								group={group}
								isRemoving={removeGroupMutation.isPending}
								key={group.id}
								onAssign={(participantId) =>
									assignMutation.mutate({ groupId: group.id, participantId })
								}
								onRemoveGroup={() =>
									removeGroupMutation.mutate({ id: group.id, acId })
								}
								onUnassign={(participantId) =>
									unassignMutation.mutate({ groupId: group.id, participantId })
								}
							/>
						);
					})}
				</div>
			)}

			{unassignedParticipants.length > 0 && (
				<div className="rounded-lg border border-dashed px-4 py-3">
					<p className="font-medium text-muted-foreground text-sm">
						Nicht zugewiesen ({unassignedParticipants.length})
					</p>
					<ul className="mt-2 flex flex-wrap gap-2">
						{unassignedParticipants.map((p) => (
							<li
								className="rounded-md border bg-background px-2 py-1 text-xs"
								key={p.id}
							>
								{p.name}
							</li>
						))}
					</ul>
				</div>
			)}

			<AddGroupForm
				acId={acId}
				isPending={createGroupMutation.isPending}
				onCreate={(name) => createGroupMutation.mutate({ acId, name })}
			/>
		</div>
	);
}

type GroupCardProps = {
	group: Group;
	availableParticipants: Participant[];
	onRemoveGroup: () => void;
	onAssign: (participantId: string) => void;
	onUnassign: (participantId: string) => void;
	isRemoving: boolean;
};

function GroupCard({
	group,
	availableParticipants,
	onRemoveGroup,
	onAssign,
	onUnassign,
	isRemoving,
}: GroupCardProps) {
	const unassignedForGroup = availableParticipants.filter(
		(p) => !group.memberships.some((m) => m.participantId === p.id),
	);

	return (
		<div className="rounded-lg border bg-card">
			<div className="flex items-center justify-between border-b px-4 py-3">
				<p className="font-medium text-sm">{group.name}</p>
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button
								aria-label="Gruppe löschen"
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
							<AlertDialogTitle>Gruppe löschen?</AlertDialogTitle>
							<AlertDialogDescription>
								Die Gruppe &ldquo;{group.name}&rdquo; und alle Zuweisungen
								werden entfernt.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Abbrechen</AlertDialogCancel>
							<AlertDialogAction onClick={onRemoveGroup} variant="destructive">
								Löschen
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			<div className="px-4 py-3">
				{group.memberships.length === 0 ? (
					<p className="text-muted-foreground text-sm">Keine Mitglieder</p>
				) : (
					<ul className="flex flex-wrap gap-2">
						{group.memberships.map((m) => (
							<li
								className="flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 font-medium text-xs"
								key={m.participantId}
							>
								{m.participant.name}
								<button
									aria-label={`${m.participant.name} entfernen`}
									className="ml-1 rounded text-muted-foreground hover:text-foreground"
									onClick={() => onUnassign(m.participantId)}
									type="button"
								>
									<XIcon className="h-3 w-3" />
								</button>
							</li>
						))}
					</ul>
				)}

				{unassignedForGroup.length > 0 && (
					<div className="mt-3">
						<label
							className="text-muted-foreground text-xs"
							htmlFor={`assign-${group.id}`}
						>
							Bewerbende zuweisen
						</label>
						<select
							className="mt-1 block w-full max-w-xs rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							id={`assign-${group.id}`}
							onChange={(e) => {
								if (e.target.value) onAssign(e.target.value);
							}}
							value=""
						>
							<option value="">Bewerbende wählen…</option>
							{unassignedForGroup.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
					</div>
				)}
			</div>
		</div>
	);
}

type AddGroupFormProps = {
	acId: string;
	onCreate: (name: string) => void;
	isPending: boolean;
};

function AddGroupForm({ onCreate, isPending }: AddGroupFormProps) {
	const [name, setName] = useState("");
	const [showForm, setShowForm] = useState(false);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!name.trim()) return;
		onCreate(name.trim());
		setName("");
		setShowForm(false);
	}

	if (!showForm) {
		return (
			<Button onClick={() => setShowForm(true)} type="button" variant="outline">
				<PlusIcon className="mr-2 h-4 w-4" />
				Gruppe hinzufügen
			</Button>
		);
	}

	return (
		<form className="rounded-lg border bg-muted/30 p-4" onSubmit={handleSubmit}>
			<p className="mb-4 font-medium text-sm">Neue Gruppe</p>
			<Field>
				<FieldLabel htmlFor="group-name">Gruppenname</FieldLabel>
				<Input
					disabled={isPending}
					id="group-name"
					onChange={(e) => setName(e.target.value)}
					placeholder="z. B. Gruppe A"
					required
					value={name}
				/>
			</Field>
			<div className="mt-4 flex gap-2">
				<Button disabled={isPending || name.trim() === ""} type="submit">
					{isPending ? "Erstellen..." : "Erstellen"}
				</Button>
				<Button
					onClick={() => {
						setShowForm(false);
						setName("");
					}}
					type="button"
					variant="ghost"
				>
					Abbrechen
				</Button>
			</div>
		</form>
	);
}

function GroupsEditorSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2].map((i) => (
				<div className="h-24 animate-pulse rounded-lg bg-muted" key={i} />
			))}
		</div>
	);
}

export { AcGroupsEditor };
