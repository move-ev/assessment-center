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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import { ParticipantAvatar } from "./participant-avatar";

type Participant = {
	id: string;
	name: string;
	email: string | null;
	avatarUrl: string | null;
};

type Props = {
	acId: string;
};

function AcParticipantsTable({ acId }: Props) {
	const utils = api.useUtils();
	const { data: participants = [], isPending } =
		api.participant.listByAc.useQuery({ acId });

	const invalidate = () => utils.participant.listByAc.invalidate({ acId });

	const removeMutation = api.participant.remove.useMutation({
		onSuccess: async () => {
			await invalidate();
			toast.success("Teilnehmer entfernt");
		},
		onError: (error) => toast.error(error.message),
	});

	function handleRemove(id: string) {
		removeMutation.mutate({ id, acId });
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-medium text-base">Teilnehmer</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Personen, die am Assessment Center teilnehmen.
				</p>
			</div>

			{isPending ? (
				<ParticipantsTableSkeleton />
			) : (
				<ParticipantsTableContent
					acId={acId}
					isRemoving={removeMutation.isPending}
					onRemove={handleRemove}
					participants={participants}
					utils={utils}
				/>
			)}

			<AddParticipantForm acId={acId} utils={utils} />
		</div>
	);
}

type TableContentProps = {
	participants: Participant[];
	acId: string;
	onRemove: (id: string) => void;
	isRemoving: boolean;
	utils: ReturnType<typeof api.useUtils>;
};

function ParticipantsTableContent({
	participants,
	acId,
	onRemove,
	isRemoving,
	utils,
}: TableContentProps) {
	const [editingId, setEditingId] = useState<string | null>(null);

	const currentEditingParticipant = editingId
		? (participants.find((p) => p.id === editingId) ?? null)
		: null;

	if (participants.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Noch keine Teilnehmer hinzugefügt.
			</p>
		);
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>E-Mail</TableHead>
						<TableHead className="w-20" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{participants.map((p) => (
						<TableRow key={p.id}>
							<TableCell>
								<div className="flex items-center gap-3">
									<ParticipantAvatar
										avatarUrl={p.avatarUrl}
										name={p.name}
										size="sm"
									/>
									<span className="font-medium">{p.name}</span>
								</div>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{p.email ?? "–"}
							</TableCell>
							<TableCell>
								<div className="flex justify-end gap-1">
									<Button
										aria-label="Bearbeiten"
										onClick={() => setEditingId(p.id)}
										size="icon-sm"
										variant="ghost"
									>
										<PencilIcon className="h-4 w-4" />
									</Button>
									<AlertDialog>
										<AlertDialogTrigger
											render={
												<Button
													aria-label="Löschen"
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
												<AlertDialogTitle>
													Teilnehmer entfernen?
												</AlertDialogTitle>
												<AlertDialogDescription>
													{p.name} wird dauerhaft aus diesem Assessment Center
													entfernt.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Abbrechen</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => onRemove(p.id)}
													variant="destructive"
												>
													Entfernen
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{currentEditingParticipant && (
				<EditParticipantDialog
					acId={acId}
					onClose={() => setEditingId(null)}
					participant={currentEditingParticipant}
					utils={utils}
				/>
			)}
		</>
	);
}

type EditDialogProps = {
	participant: Participant;
	acId: string;
	onClose: () => void;
	utils: ReturnType<typeof api.useUtils>;
};

function EditParticipantDialog({
	participant,
	acId,
	onClose,
	utils,
}: EditDialogProps) {
	const [name, setName] = useState(participant.name);
	const [email, setEmail] = useState(participant.email ?? "");

	const updateMutation = api.participant.update.useMutation({
		onSuccess: async () => {
			await utils.participant.listByAc.invalidate({ acId });
			toast.success("Teilnehmer aktualisiert");
			onClose();
		},
		onError: (error) => toast.error(error.message),
	});

	const zodErrors = updateMutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		updateMutation.mutate({
			id: participant.id,
			acId,
			name,
			email: email.trim() !== "" ? email : undefined,
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
					<DialogTitle>Teilnehmer bearbeiten</DialogTitle>
				</DialogHeader>
				<form id="edit-participant-form" onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="edit-name">Name</FieldLabel>
							<Input
								disabled={updateMutation.isPending}
								id="edit-name"
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
							<FieldLabel htmlFor="edit-email">
								E-Mail{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</FieldLabel>
							<Input
								disabled={updateMutation.isPending}
								id="edit-email"
								onChange={(e) => setEmail(e.target.value)}
								type="email"
								value={email}
							/>
						</Field>
					</FieldGroup>
				</form>
				<DialogFooter>
					<Button onClick={onClose} type="button" variant="outline">
						Abbrechen
					</Button>
					<Button
						disabled={updateMutation.isPending || name.trim() === ""}
						form="edit-participant-form"
						type="submit"
					>
						{updateMutation.isPending ? "Speichert..." : "Speichern"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type AddFormProps = {
	acId: string;
	utils: ReturnType<typeof api.useUtils>;
};

function AddParticipantForm({ acId, utils }: AddFormProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [showForm, setShowForm] = useState(false);

	const createMutation = api.participant.create.useMutation({
		onSuccess: async () => {
			await utils.participant.listByAc.invalidate({ acId });
			setName("");
			setEmail("");
			setShowForm(false);
			toast.success("Teilnehmer hinzugefügt");
		},
		onError: (error) => toast.error(error.message),
	});

	const zodErrors = createMutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		createMutation.mutate({
			acId,
			name,
			email: email.trim() !== "" ? email : undefined,
		});
	}

	if (!showForm) {
		return (
			<Button onClick={() => setShowForm(true)} type="button" variant="outline">
				<PlusIcon className="mr-2 h-4 w-4" />
				Teilnehmer hinzufügen
			</Button>
		);
	}

	return (
		<form className="rounded-lg border bg-muted/30 p-4" onSubmit={handleSubmit}>
			<p className="mb-4 font-medium text-sm">Neuer Teilnehmer</p>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="add-name">Name</FieldLabel>
					<Input
						disabled={createMutation.isPending}
						id="add-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="Vor- und Nachname"
						required
						value={name}
					/>
					{zodErrors?.name && (
						<FieldError errors={zodErrors.name.map((m) => ({ message: m }))} />
					)}
				</Field>
				<Field>
					<FieldLabel htmlFor="add-email">
						E-Mail{" "}
						<span className="font-normal text-muted-foreground">
							(optional)
						</span>
					</FieldLabel>
					<Input
						disabled={createMutation.isPending}
						id="add-email"
						onChange={(e) => setEmail(e.target.value)}
						placeholder="name@beispiel.de"
						type="email"
						value={email}
					/>
				</Field>
			</FieldGroup>
			<div className="mt-4 flex gap-2">
				<Button
					disabled={createMutation.isPending || name.trim() === ""}
					type="submit"
				>
					{createMutation.isPending ? "Hinzufügen..." : "Hinzufügen"}
				</Button>
				<Button
					onClick={() => {
						setShowForm(false);
						setName("");
						setEmail("");
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

function ParticipantsTableSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2, 3].map((i) => (
				<div className="h-10 animate-pulse rounded bg-muted" key={i} />
			))}
		</div>
	);
}

export { AcParticipantsTable };
