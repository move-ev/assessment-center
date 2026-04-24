"use client";

import {
	ChevronRightIcon,
	PlusIcon,
	Trash2Icon,
	UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/routes";
import { api } from "@/trpc/react";

type Task = {
	id: string;
	name: string;
	description: string | null;
	isTeamTask: boolean;
	_count: { criteria: number };
};

type Props = {
	acId: string;
};

function AcTasksTable({ acId }: Props) {
	const utils = api.useUtils();
	const router = useRouter();
	const { data: tasks = [], isPending } = api.task.listByAc.useQuery({ acId });

	const invalidate = () => utils.task.listByAc.invalidate({ acId });

	const removeMutation = api.task.remove.useMutation({
		onSuccess: async () => {
			await invalidate();
			toast.success("Aufgabe gelöscht");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-medium text-base">Aufgaben</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Aufgaben, die Bewerbende im Assessment Center bearbeiten.
				</p>
			</div>

			{isPending ? (
				<TasksTableSkeleton />
			) : tasks.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Noch keine Aufgaben erstellt.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Typ</TableHead>
							<TableHead>Kriterien</TableHead>
							<TableHead className="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{tasks.map((task) => (
							<TaskTableRow
								acId={acId}
								isRemoving={removeMutation.isPending}
								key={task.id}
								onNavigate={() =>
									router.push(ROUTES.acSetupTask(acId, task.id))
								}
								onRemove={() => removeMutation.mutate({ id: task.id, acId })}
								task={task}
							/>
						))}
					</TableBody>
				</Table>
			)}

			<AddTaskForm acId={acId} utils={utils} />
		</div>
	);
}

type TaskTableRowProps = {
	task: Task;
	acId: string;
	onNavigate: () => void;
	onRemove: () => void;
	isRemoving: boolean;
};

function TaskTableRow({
	task,
	onNavigate,
	onRemove,
	isRemoving,
}: TaskTableRowProps) {
	return (
		<TableRow className="cursor-pointer" onClick={onNavigate}>
			<TableCell className="font-medium">{task.name}</TableCell>
			<TableCell>
				{task.isTeamTask ? (
					<Badge variant="secondary">
						<UsersIcon />
						Gruppenaufgabe
					</Badge>
				) : (
					<Badge variant="outline">Einzelaufgabe</Badge>
				)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{task._count.criteria}
			</TableCell>
			<TableCell onClick={(e) => e.stopPropagation()}>
				<div className="flex justify-end gap-1">
					<Button
						aria-label="Aufgabe öffnen"
						onClick={onNavigate}
						size="icon-sm"
						variant="ghost"
					>
						<ChevronRightIcon className="h-4 w-4" />
					</Button>
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button
									aria-label="Aufgabe löschen"
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
								<AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
								<AlertDialogDescription>
									&ldquo;{task.name}&rdquo; wird dauerhaft entfernt. Alle
									zugehörigen Kriterien werden ebenfalls gelöscht.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Abbrechen</AlertDialogCancel>
								<AlertDialogAction onClick={onRemove} variant="destructive">
									Löschen
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</TableCell>
		</TableRow>
	);
}

type AddTaskFormProps = {
	acId: string;
	utils: ReturnType<typeof api.useUtils>;
};

function AddTaskForm({ acId, utils }: AddTaskFormProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isTeamTask, setIsTeamTask] = useState(false);
	const [showForm, setShowForm] = useState(false);

	const createMutation = api.task.create.useMutation({
		onSuccess: async () => {
			await utils.task.listByAc.invalidate({ acId });
			setName("");
			setDescription("");
			setIsTeamTask(false);
			setShowForm(false);
			toast.success("Aufgabe erstellt");
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
			description: description.trim() !== "" ? description : undefined,
			isTeamTask,
		});
	}

	function handleCancel() {
		setShowForm(false);
		setName("");
		setDescription("");
		setIsTeamTask(false);
	}

	if (!showForm) {
		return (
			<Button onClick={() => setShowForm(true)} type="button" variant="outline">
				<PlusIcon className="mr-2 h-4 w-4" />
				Aufgabe hinzufügen
			</Button>
		);
	}

	return (
		<form className="rounded-lg border bg-muted/30 p-4" onSubmit={handleSubmit}>
			<p className="mb-4 font-medium text-sm">Neue Aufgabe</p>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="task-name">Name</FieldLabel>
					<Input
						disabled={createMutation.isPending}
						id="task-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="z. B. Präsentation"
						required
						value={name}
					/>
					{zodErrors?.name && (
						<FieldError errors={zodErrors.name.map((m) => ({ message: m }))} />
					)}
				</Field>
				<Field>
					<FieldLabel htmlFor="task-description">
						Beschreibung{" "}
						<span className="font-normal text-muted-foreground">
							(optional)
						</span>
					</FieldLabel>
					<Input
						disabled={createMutation.isPending}
						id="task-description"
						onChange={(e) => setDescription(e.target.value)}
						value={description}
					/>
				</Field>
				<Field>
					<div className="flex items-center gap-3">
						<Switch
							checked={isTeamTask}
							disabled={createMutation.isPending}
							id="task-team"
							onCheckedChange={(v) => setIsTeamTask(v)}
						/>
						<FieldLabel htmlFor="task-team">Gruppenaufgabe</FieldLabel>
					</div>
				</Field>
			</FieldGroup>
			<div className="mt-4 flex gap-2">
				<Button
					disabled={createMutation.isPending || name.trim() === ""}
					type="submit"
				>
					{createMutation.isPending ? "Erstellen..." : "Erstellen"}
				</Button>
				<Button onClick={handleCancel} type="button" variant="ghost">
					Abbrechen
				</Button>
			</div>
		</form>
	);
}

function TasksTableSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2, 3].map((i) => (
				<div className="h-10 animate-pulse rounded bg-muted" key={i} />
			))}
		</div>
	);
}

export { AcTasksTable };
