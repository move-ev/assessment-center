"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";

type Participant = { id: string; name: string; email: string | null };

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
				<h2 className="text-base font-medium">Teilnehmer</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Personen, die am Assessment Center teilnehmen.
				</p>
			</div>

			{isPending ? (
				<ParticipantsTableSkeleton />
			) : (
				<ParticipantsTableContent
					participants={participants}
					acId={acId}
					onRemove={handleRemove}
					isRemoving={removeMutation.isPending}
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
	const [editingParticipant, setEditingParticipant] =
		useState<Participant | null>(null);

	if (participants.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
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
							<TableCell className="font-medium">{p.name}</TableCell>
							<TableCell className="text-muted-foreground">
								{p.email ?? "–"}
							</TableCell>
							<TableCell>
								<div className="flex justify-end gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => setEditingParticipant(p)}
										aria-label="Bearbeiten"
									>
										<PencilIcon className="h-4 w-4" />
									</Button>
									<AlertDialog>
										<AlertDialogTrigger
											render={
												<Button
													variant="ghost"
													size="icon-sm"
													disabled={isRemoving}
													aria-label="Löschen"
												>
													<Trash2Icon className="h-4 w-4" />
												</Button>
											}
										/>
										<AlertDialogContent size="sm">
											<AlertDialogHeader>
												<AlertDialogTitle>Teilnehmer entfernen?</AlertDialogTitle>
												<AlertDialogDescription>
													{p.name} wird dauerhaft aus diesem Assessment Center
													entfernt.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Abbrechen</AlertDialogCancel>
												<AlertDialogAction
													variant="destructive"
													onClick={() => onRemove(p.id)}
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

			{editingParticipant && (
				<EditParticipantDialog
					participant={editingParticipant}
					acId={acId}
					onClose={() => setEditingParticipant(null)}
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

	const zodErrors = updateMutation.error?.data?.zodError
		?.fieldErrors as Record<string, string[]> | undefined;

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
		<Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Teilnehmer bearbeiten</DialogTitle>
				</DialogHeader>
				<form id="edit-participant-form" onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="edit-name">Name</FieldLabel>
							<Input
								id="edit-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={updateMutation.isPending}
								required
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
								id="edit-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={updateMutation.isPending}
							/>
						</Field>
					</FieldGroup>
				</form>
				<DialogFooter>
					<Button variant="outline" type="button" onClick={onClose}>
						Abbrechen
					</Button>
					<Button
						form="edit-participant-form"
						type="submit"
						disabled={updateMutation.isPending || name.trim() === ""}
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

	const zodErrors = createMutation.error?.data?.zodError
		?.fieldErrors as Record<string, string[]> | undefined;

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
			<Button
				type="button"
				variant="outline"
				onClick={() => setShowForm(true)}
			>
				<PlusIcon className="mr-2 h-4 w-4" />
				Teilnehmer hinzufügen
			</Button>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="rounded-lg border bg-muted/30 p-4">
			<p className="mb-4 text-sm font-medium">Neuer Teilnehmer</p>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="add-name">Name</FieldLabel>
					<Input
						id="add-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						disabled={createMutation.isPending}
						placeholder="Vor- und Nachname"
						required
					/>
					{zodErrors?.name && (
						<FieldError errors={zodErrors.name.map((m) => ({ message: m }))} />
					)}
				</Field>
				<Field>
					<FieldLabel htmlFor="add-email">
						E-Mail{" "}
						<span className="font-normal text-muted-foreground">(optional)</span>
					</FieldLabel>
					<Input
						id="add-email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={createMutation.isPending}
						placeholder="name@beispiel.de"
					/>
				</Field>
			</FieldGroup>
			<div className="mt-4 flex gap-2">
				<Button
					type="submit"
					disabled={createMutation.isPending || name.trim() === ""}
				>
					{createMutation.isPending ? "Hinzufügen..." : "Hinzufügen"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={() => {
						setShowForm(false);
						setName("");
						setEmail("");
					}}
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
				<div key={i} className="h-10 animate-pulse rounded bg-muted" />
			))}
		</div>
	);
}

export { AcParticipantsTable };
