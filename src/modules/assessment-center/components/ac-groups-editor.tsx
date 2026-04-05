"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
				<h2 className="text-base font-medium">Gruppen</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Teilnehmer in Gruppen einteilen. Jeder Teilnehmer gehört genau einer
					Gruppe an.
				</p>
			</div>

			{groups.length === 0 ? (
				<p className="text-sm text-muted-foreground">
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
								key={group.id}
								group={group}
								availableParticipants={availableForGroup}
								onRemoveGroup={() =>
									removeGroupMutation.mutate({ id: group.id, acId })
								}
								onAssign={(participantId) =>
									assignMutation.mutate({ groupId: group.id, participantId })
								}
								onUnassign={(participantId) =>
									unassignMutation.mutate({ groupId: group.id, participantId })
								}
								isRemoving={removeGroupMutation.isPending}
							/>
						);
					})}
				</div>
			)}

			{unassignedParticipants.length > 0 && (
				<div className="rounded-lg border border-dashed px-4 py-3">
					<p className="text-sm font-medium text-muted-foreground">
						Nicht zugewiesen ({unassignedParticipants.length})
					</p>
					<ul className="mt-2 flex flex-wrap gap-2">
						{unassignedParticipants.map((p) => (
							<li
								key={p.id}
								className="rounded-md border bg-background px-2 py-1 text-xs"
							>
								{p.name}
							</li>
						))}
					</ul>
				</div>
			)}

			<AddGroupForm
				acId={acId}
				onCreate={(name) => createGroupMutation.mutate({ acId, name })}
				isPending={createGroupMutation.isPending}
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
				<p className="text-sm font-medium">{group.name}</p>
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={isRemoving}
								aria-label="Gruppe löschen"
							>
								<Trash2Icon className="h-4 w-4" />
							</Button>
						}
					/>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogTitle>Gruppe löschen?</AlertDialogTitle>
							<AlertDialogDescription>
								Die Gruppe &ldquo;{group.name}&rdquo; und alle Zuweisungen werden
								entfernt.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Abbrechen</AlertDialogCancel>
							<AlertDialogAction variant="destructive" onClick={onRemoveGroup}>
								Löschen
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			<div className="px-4 py-3">
				{group.memberships.length === 0 ? (
					<p className="text-sm text-muted-foreground">Keine Mitglieder</p>
				) : (
					<ul className="flex flex-wrap gap-2">
						{group.memberships.map((m) => (
							<li
								key={m.participantId}
								className="flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 text-xs font-medium"
							>
								{m.participant.name}
								<button
									type="button"
									onClick={() => onUnassign(m.participantId)}
									className="ml-1 rounded text-muted-foreground hover:text-foreground"
									aria-label={`${m.participant.name} entfernen`}
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
							htmlFor={`assign-${group.id}`}
							className="text-xs text-muted-foreground"
						>
							Teilnehmer zuweisen
						</label>
						<select
							id={`assign-${group.id}`}
							className="mt-1 block w-full max-w-xs rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							value=""
							onChange={(e) => {
								if (e.target.value) onAssign(e.target.value);
							}}
						>
							<option value="">Teilnehmer wählen…</option>
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
			<Button type="button" variant="outline" onClick={() => setShowForm(true)}>
				<PlusIcon className="mr-2 h-4 w-4" />
				Gruppe hinzufügen
			</Button>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-lg border bg-muted/30 p-4"
		>
			<p className="mb-4 text-sm font-medium">Neue Gruppe</p>
			<Field>
				<FieldLabel htmlFor="group-name">Gruppenname</FieldLabel>
				<Input
					id="group-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={isPending}
					placeholder="z. B. Gruppe A"
					required
				/>
			</Field>
			<div className="mt-4 flex gap-2">
				<Button type="submit" disabled={isPending || name.trim() === ""}>
					{isPending ? "Erstellen..." : "Erstellen"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={() => {
						setShowForm(false);
						setName("");
					}}
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
				<div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
			))}
		</div>
	);
}

export { AcGroupsEditor };
