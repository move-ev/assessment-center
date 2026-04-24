"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";
import { api } from "@/trpc/react";
import { AcCriteriaEditor } from "./ac-criteria-editor";

type Props = {
	acId: string;
	taskId: string;
};

function AcTaskDetail({ acId, taskId }: Props) {
	const utils = api.useUtils();
	const { data: task, isPending } = api.task.getById.useQuery({
		id: taskId,
		acId,
	});

	if (isPending) {
		return <AcTaskDetailSkeleton />;
	}

	if (!task) {
		return null;
	}

	return (
		<div className="max-w-xl space-y-8">
			<div className="flex items-center gap-3">
				<Link
					aria-label="Zurück zu Aufgaben"
					className="text-muted-foreground text-sm hover:text-foreground"
					href={ROUTES.acSetupTasks(acId)}
				>
					<ArrowLeftIcon className="h-4 w-4" />
				</Link>
				<div>
					<h2 className="font-medium text-base">{task.name}</h2>
					<p className="text-muted-foreground text-sm">Aufgabe bearbeiten</p>
				</div>
			</div>

			<TaskEditForm acId={acId} task={task} utils={utils} />

			<Separator />

			<AcCriteriaEditor
				acId={acId}
				criteriaGroups={task.criteriaGroups}
				taskId={taskId}
				utils={utils}
			/>
		</div>
	);
}

type TaskData = {
	id: string;
	name: string;
	description: string | null;
	isTeamTask: boolean;
	criteriaGroups: Array<{
		id: string;
		title: string;
		factorType: "POTENTIAL" | "COMPETENCE";
		criteria: Array<{
			id: string;
			criteriaGroupId: string;
			name: string;
			description: string | null;
			type: "QUANTITATIVE" | "QUALITATIVE";
			weight: number | null;
		}>;
	}>;
};

type TaskEditFormProps = {
	acId: string;
	task: TaskData;
	utils: ReturnType<typeof api.useUtils>;
};

function TaskEditForm({ acId, task, utils }: TaskEditFormProps) {
	const [name, setName] = useState(task.name);
	const [description, setDescription] = useState(task.description ?? "");
	const [isTeamTask, setIsTeamTask] = useState(task.isTeamTask);

	const updateMutation = api.task.update.useMutation({
		onSuccess: async () => {
			await utils.task.getById.invalidate({ id: task.id, acId });
			await utils.task.listByAc.invalidate({ acId });
			toast.success("Aufgabe gespeichert");
		},
		onError: (error) => toast.error(error.message),
	});

	const zodErrors = updateMutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		updateMutation.mutate({
			id: task.id,
			acId,
			name,
			description: description.trim() !== "" ? description : undefined,
			isTeamTask,
		});
	}

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="task-name">Name</FieldLabel>
					<Input
						disabled={updateMutation.isPending}
						id="task-name"
						onChange={(e) => setName(e.target.value)}
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
					<Textarea
						disabled={updateMutation.isPending}
						id="task-description"
						onChange={(e) => setDescription(e.target.value)}
						value={description}
					/>
				</Field>
				<Field>
					<div className="flex items-center gap-3">
						<Switch
							checked={isTeamTask}
							disabled={updateMutation.isPending}
							id="task-team"
							onCheckedChange={(v) => setIsTeamTask(v)}
						/>
						<FieldLabel htmlFor="task-team">Gruppenaufgabe</FieldLabel>
					</div>
					<p className="text-muted-foreground text-xs">
						Bewerbende bearbeiten diese Aufgabe gemeinsam als Gruppe.
					</p>
				</Field>
			</FieldGroup>
			<div className="mt-6">
				<Button
					disabled={updateMutation.isPending || name.trim() === ""}
					type="submit"
				>
					{updateMutation.isPending ? "Speichert..." : "Speichern"}
				</Button>
			</div>
		</form>
	);
}

function AcTaskDetailSkeleton() {
	return (
		<div className="max-w-xl space-y-4">
			<div className="h-5 w-32 animate-pulse rounded bg-muted" />
			<div className="h-9 w-full animate-pulse rounded bg-muted" />
			<div className="h-20 w-full animate-pulse rounded bg-muted" />
		</div>
	);
}

export { AcTaskDetail };
