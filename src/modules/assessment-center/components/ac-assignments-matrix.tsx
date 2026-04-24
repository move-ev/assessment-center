"use client";

import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";

type Participant = { id: string; name: string };
type Task = { id: string; name: string };
type Reviewer = {
	id: string;
	userId: string;
	user: { id: string; name: string };
};
type Assignment = {
	id: string;
	reviewerId: string;
	participantId: string;
	taskId: string;
	reviewer: { user: { id: string; name: string } };
};

type Props = {
	acId: string;
};

function AcAssignmentsMatrix({ acId }: Props) {
	const { data: participants = [], isPending: participantsLoading } =
		api.participant.listByAc.useQuery({ acId });
	const { data: tasks = [], isPending: tasksLoading } =
		api.task.listByAc.useQuery({ acId });
	const { data: reviewers = [], isPending: reviewersLoading } =
		api.reviewer.listByAc.useQuery({ acId });
	const { data: assignments = [], isPending: assignmentsLoading } =
		api.assignment.listByAc.useQuery({ acId });

	const isPending =
		participantsLoading ||
		tasksLoading ||
		reviewersLoading ||
		assignmentsLoading;

	if (isPending) {
		return <AssignmentsMatrixSkeleton />;
	}

	const hasRequiredData =
		participants.length > 0 && tasks.length > 0 && reviewers.length > 0;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-medium text-base">Zuweisungen</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Bewerter Bewerbenden pro Aufgabe zuweisen.
				</p>
			</div>

			{!hasRequiredData ? (
				<p className="text-muted-foreground text-sm">
					Füge zuerst mindestens Bewerbende, eine Aufgabe und einen Bewerter
					hinzu.
				</p>
			) : (
				<AssignmentsGrid
					acId={acId}
					assignments={assignments}
					participants={participants}
					reviewers={reviewers}
					tasks={tasks}
				/>
			)}
		</div>
	);
}

type AssignmentsGridProps = {
	acId: string;
	participants: Participant[];
	tasks: Task[];
	reviewers: Reviewer[];
	assignments: Assignment[];
};

function AssignmentsGrid({
	acId,
	participants,
	tasks,
	reviewers,
	assignments,
}: AssignmentsGridProps) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-max border-collapse text-sm">
				<thead>
					<tr>
						<th className="min-w-[140px] border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground">
							Bewerbende
						</th>
						{tasks.map((task) => (
							<th
								className="min-w-[180px] border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground"
								key={task.id}
							>
								<div className="space-y-1.5">
									<span>{task.name}</span>
									<BulkAssignControl
										acId={acId}
										assignments={assignments}
										participants={participants}
										reviewers={reviewers}
										taskId={task.id}
									/>
								</div>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{participants.map((participant) => (
						<tr key={participant.id}>
							<td className="border bg-muted/20 px-3 py-2 font-medium">
								{participant.name}
							</td>
							{tasks.map((task) => {
								const cellAssignments = assignments.filter(
									(a) =>
										a.participantId === participant.id && a.taskId === task.id,
								);
								const assignedReviewerIds = new Set(
									cellAssignments.map((a) => a.reviewerId),
								);
								const availableReviewers = reviewers.filter(
									(r) => !assignedReviewerIds.has(r.id),
								);

								return (
									<td className="border px-3 py-2 align-top" key={task.id}>
										<AssignmentCell
											acId={acId}
											availableReviewers={availableReviewers}
											cellAssignments={cellAssignments}
											participantId={participant.id}
											taskId={task.id}
										/>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

type AssignmentCellProps = {
	acId: string;
	participantId: string;
	taskId: string;
	cellAssignments: Assignment[];
	availableReviewers: Reviewer[];
};

function AssignmentCell({
	acId,
	participantId,
	taskId,
	cellAssignments,
	availableReviewers,
}: AssignmentCellProps) {
	const utils = api.useUtils();

	const invalidate = () => utils.assignment.listByAc.invalidate({ acId });

	const createMutation = api.assignment.create.useMutation({
		onSuccess: async () => {
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const removeMutation = api.assignment.remove.useMutation({
		onSuccess: async () => {
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	function handleAdd(reviewerId: string) {
		if (!reviewerId) return;
		createMutation.mutate({ acId, reviewerId, participantId, taskId });
	}

	return (
		<div className="space-y-1.5">
			{cellAssignments.map((assignment) => (
				<div
					className="flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 font-medium text-xs"
					key={assignment.id}
				>
					<span className="flex-1 truncate">
						{assignment.reviewer.user.name}
					</span>
					<button
						aria-label={`${assignment.reviewer.user.name} entfernen`}
						className="shrink-0 rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
						disabled={removeMutation.isPending}
						onClick={() => removeMutation.mutate({ id: assignment.id, acId })}
						type="button"
					>
						<XIcon className="h-3 w-3" />
					</button>
				</div>
			))}

			{availableReviewers.length > 0 && (
				<select
					aria-label="Bewerter zuweisen"
					className="block w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
					disabled={createMutation.isPending}
					onChange={(e) => handleAdd(e.target.value)}
					value=""
				>
					<option value="">Bewerter…</option>
					{availableReviewers.map((r) => (
						<option key={r.id} value={r.id}>
							{r.user.name}
						</option>
					))}
				</select>
			)}
		</div>
	);
}

type BulkAssignControlProps = {
	acId: string;
	taskId: string;
	participants: Participant[];
	reviewers: Reviewer[];
	assignments: Assignment[];
};

function BulkAssignControl({
	acId,
	taskId,
	participants,
	reviewers,
	assignments,
}: BulkAssignControlProps) {
	const utils = api.useUtils();

	const createMutation = api.assignment.create.useMutation({
		onError: () => {
			// Errors are handled per-result in handleBulkAssign
		},
	});

	async function handleBulkAssign(reviewerId: string) {
		if (!reviewerId) return;

		const unassignedParticipants = participants.filter(
			(p) =>
				!assignments.some(
					(a) =>
						a.taskId === taskId &&
						a.participantId === p.id &&
						a.reviewerId === reviewerId,
				),
		);

		if (unassignedParticipants.length === 0) {
			toast.info("Alle Bewerbende sind diesem Bewerter bereits zugewiesen");
			return;
		}

		const results = await Promise.allSettled(
			unassignedParticipants.map((p) =>
				createMutation.mutateAsync({
					acId,
					reviewerId,
					participantId: p.id,
					taskId,
				}),
			),
		);

		await utils.assignment.listByAc.invalidate({ acId });

		const failedCount = results.filter((r) => r.status === "rejected").length;
		const succeededCount = results.filter(
			(r) => r.status === "fulfilled",
		).length;

		if (failedCount === 0) {
			toast.success(
				`${succeededCount} ${succeededCount === 1 ? "Zuweisung" : "Zuweisungen"} erstellt`,
			);
		} else if (succeededCount > 0) {
			toast.warning(
				`${succeededCount} von ${results.length} Zuweisungen erstellt – ${failedCount} fehlgeschlagen`,
			);
		} else {
			toast.error("Zuweisungen konnten nicht erstellt werden");
		}
	}

	if (reviewers.length === 0) {
		return null;
	}

	return (
		<select
			aria-label="Alle zuweisen"
			className="block w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
			disabled={createMutation.isPending}
			onChange={(e) => handleBulkAssign(e.target.value)}
			value=""
		>
			<option value="">Alle zuweisen…</option>
			{reviewers.map((r) => (
				<option key={r.id} value={r.id}>
					{r.user.name}
				</option>
			))}
		</select>
	);
}

function AssignmentsMatrixSkeleton() {
	return (
		<div className="space-y-3">
			<div className="h-5 w-32 animate-pulse rounded bg-muted" />
			<div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
		</div>
	);
}

export { AcAssignmentsMatrix };
