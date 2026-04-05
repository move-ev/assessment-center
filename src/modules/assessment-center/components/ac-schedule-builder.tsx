"use client";

import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";

type Group = { id: string; name: string };
type Day = { id: string; date: Date };
type Task = { id: string; name: string };
type ScheduleEntry = {
	id: string;
	dayId: string;
	groupId: string;
	taskId: string;
	orderIndex: number;
	task: { name: string };
};

type Props = {
	acId: string;
};

function AcScheduleBuilder({ acId }: Props) {
	const { data: groups = [], isPending: groupsLoading } =
		api.group.listByAc.useQuery({ acId });
	const { data: ac, isPending: acLoading } =
		api.assessmentCenter.getDetails.useQuery({ id: acId });
	const { data: tasks = [], isPending: tasksLoading } =
		api.task.listByAc.useQuery({ acId });
	const { data: entries = [], isPending: entriesLoading } =
		api.schedule.listByAc.useQuery({ acId });

	const days = ac?.days ?? [];
	const isPending =
		groupsLoading || acLoading || tasksLoading || entriesLoading;

	if (isPending) {
		return <ScheduleBuilderSkeleton />;
	}

	if (groups.length === 0 || days.length === 0 || tasks.length === 0) {
		return (
			<div className="space-y-4">
				<ScheduleHeader />
				<p className="text-muted-foreground text-sm">
					Füge zuerst mindestens eine Gruppe, einen Tag und eine Aufgabe hinzu,
					um den Zeitplan zu erstellen.
				</p>
			</div>
		);
	}

	const cellMap = buildCellMap(entries);

	return (
		<div className="space-y-6">
			<ScheduleHeader />
			<ScheduleGrid
				acId={acId}
				cellMap={cellMap}
				days={days}
				groups={groups}
				tasks={tasks}
			/>
		</div>
	);
}

function ScheduleHeader() {
	return (
		<div>
			<h2 className="font-medium text-base">Zeitplan</h2>
			<p className="mt-1 text-muted-foreground text-sm">
				Weise Gruppen Aufgaben für jeden Tag zu. Nutze die Pfeile, um die
				Reihenfolge innerhalb einer Zelle anzupassen.
			</p>
		</div>
	);
}

function buildCellMap(entries: ScheduleEntry[]): Map<string, ScheduleEntry[]> {
	const map = new Map<string, ScheduleEntry[]>();
	for (const entry of entries) {
		const key = `${entry.dayId}-${entry.groupId}`;
		const existing = map.get(key) ?? [];
		existing.push(entry);
		map.set(key, existing);
	}
	return map;
}

type ScheduleGridProps = {
	acId: string;
	groups: Group[];
	days: Day[];
	tasks: Task[];
	cellMap: Map<string, ScheduleEntry[]>;
};

function ScheduleGrid({
	acId,
	groups,
	days,
	tasks,
	cellMap,
}: ScheduleGridProps) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-max border-collapse text-sm">
				<thead>
					<tr>
						<th className="min-w-[120px] border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground">
							Gruppe
						</th>
						{days.map((day) => (
							<th
								className="min-w-[200px] border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground"
								key={day.id}
							>
								{day.date.toLocaleDateString("de-DE", {
									weekday: "short",
									day: "2-digit",
									month: "2-digit",
								})}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{groups.map((group) => (
						<tr key={group.id}>
							<td className="border bg-muted/20 px-3 py-2 font-medium">
								{group.name}
							</td>
							{days.map((day) => {
								const cellEntries = cellMap.get(`${day.id}-${group.id}`) ?? [];
								const scheduledTaskIds = new Set(
									cellEntries.map((e) => e.taskId),
								);
								const availableTasks = tasks.filter(
									(t) => !scheduledTaskIds.has(t.id),
								);

								return (
									<td className="border px-3 py-2 align-top" key={day.id}>
										<ScheduleCell
											acId={acId}
											availableTasks={availableTasks}
											dayId={day.id}
											entries={cellEntries}
											groupId={group.id}
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

type ScheduleCellProps = {
	acId: string;
	dayId: string;
	groupId: string;
	entries: ScheduleEntry[];
	availableTasks: Task[];
};

function ScheduleCell({
	acId,
	dayId,
	groupId,
	entries,
	availableTasks,
}: ScheduleCellProps) {
	const utils = api.useUtils();

	const invalidate = () => utils.schedule.listByAc.invalidate({ acId });

	const createMutation = api.schedule.createEntry.useMutation({
		onSuccess: async () => {
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const removeMutation = api.schedule.removeEntry.useMutation({
		onSuccess: async () => {
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const reorderMutation = api.schedule.reorderEntry.useMutation({
		onSuccess: async () => {
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const isMutating =
		createMutation.isPending ||
		removeMutation.isPending ||
		reorderMutation.isPending;

	return (
		<div className="space-y-1.5">
			{entries.map((entry, index) => (
				<div
					className="flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-1 font-medium text-xs"
					key={entry.id}
				>
					{entries.length > 1 && (
						<div className="flex shrink-0 flex-col">
							<button
								aria-label="Nach oben"
								className="rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
								disabled={index === 0 || isMutating}
								onClick={() =>
									reorderMutation.mutate({
										id: entry.id,
										acId,
										direction: "up",
									})
								}
								type="button"
							>
								<ChevronUpIcon className="h-3 w-3" />
							</button>
							<button
								aria-label="Nach unten"
								className="rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
								disabled={index === entries.length - 1 || isMutating}
								onClick={() =>
									reorderMutation.mutate({
										id: entry.id,
										acId,
										direction: "down",
									})
								}
								type="button"
							>
								<ChevronDownIcon className="h-3 w-3" />
							</button>
						</div>
					)}
					<span className="flex-1 truncate">{entry.task.name}</span>
					<button
						aria-label={`${entry.task.name} entfernen`}
						className="shrink-0 rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
						disabled={isMutating}
						onClick={() => removeMutation.mutate({ id: entry.id, acId })}
						type="button"
					>
						<XIcon className="h-3 w-3" />
					</button>
				</div>
			))}

			{availableTasks.length > 0 && (
				<select
					aria-label="Aufgabe hinzufügen"
					className="block w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
					disabled={isMutating}
					onChange={(e) => {
						if (e.target.value)
							createMutation.mutate({
								acId,
								dayId,
								groupId,
								taskId: e.target.value,
							});
					}}
					value=""
				>
					<option value="">+ Aufgabe…</option>
					{availableTasks.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</select>
			)}
		</div>
	);
}

function ScheduleBuilderSkeleton() {
	return (
		<div className="space-y-3">
			<div className="h-5 w-24 animate-pulse rounded bg-muted" />
			<div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
		</div>
	);
}

export { AcScheduleBuilder };
