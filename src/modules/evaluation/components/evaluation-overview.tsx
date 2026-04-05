import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/routes";
import type { EvaluationOverviewData } from "../server/get-evaluation-overview";

type Props = {
	acId: string;
	overview: EvaluationOverviewData;
};

function EvaluationOverview({ acId, overview }: Props) {
	if (overview.groups.length === 0) {
		return <OverviewEmptyState acId={acId} />;
	}

	return (
		<div className="space-y-6 p-6">
			<header className="space-y-1">
				<h1 className="font-medium text-xl">Live-Übersicht</h1>
				<p className="text-muted-foreground text-sm">
					Fortschritt der Bewertungsaufgaben pro Gruppe, Teilnehmer und Aufgabe.
				</p>
			</header>

			<SummaryGrid summary={overview.summary} />

			{overview.summary.reviewableAssignments === 0 && (
				<OverviewSetupHint acId={acId} />
			)}

			<div className="space-y-6">
				{overview.groups.map((group) => (
					<GroupCard group={group} key={group.id} />
				))}
			</div>
		</div>
	);
}

function SummaryGrid({
	summary,
}: {
	summary: EvaluationOverviewData["summary"];
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<SummaryCard
				description={`${summary.completedAssignments} von ${summary.reviewableAssignments} Bewertungen abgeschlossen`}
				label="Bewertungsfortschritt"
				value={`${summary.completionPercent}%`}
			/>
			<SummaryCard
				description="Noch nicht vollständig erfasste Reviewer-Zuweisungen"
				label="Offene Bewertungen"
				value={summary.unratedAssignments.toString()}
			/>
			<SummaryCard
				description={`${summary.groupCount} Gruppen, ${summary.taskCount} Aufgaben, ${summary.dayCount} Tage`}
				label="Teilnehmer"
				value={summary.participantCount.toString()}
			/>
			<SummaryCard
				description={`${summary.reviewerCount} Bewerter, ${summary.assignmentsWithoutCriteria} Zuweisungen ohne Kriterien`}
				label="Reviewer-Setup"
				value={summary.totalAssignments.toString()}
			/>
		</div>
	);
}

type SummaryCardProps = {
	label: string;
	value: string;
	description: string;
};

function SummaryCard({ label, value, description }: SummaryCardProps) {
	return (
		<Card size="sm">
			<CardHeader className="pb-0">
				<CardTitle className="text-muted-foreground text-sm">{label}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1">
				<p className="font-semibold text-2xl">{value}</p>
				<p className="text-muted-foreground text-sm">{description}</p>
			</CardContent>
		</Card>
	);
}

function OverviewSetupHint({ acId }: { acId: string }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">
					Bewertungen noch nicht startklar
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="text-muted-foreground text-sm">
					Für die Live-Übersicht fehlen entweder Reviewer-Zuweisungen oder
					Bewertungskriterien. Sobald Aufgaben Kriterien haben und zugewiesen
					sind, erscheint hier der Fortschritt live.
				</p>
				<div className="flex flex-wrap gap-2">
					<Link
						className="text-primary text-sm underline underline-offset-4"
						href={ROUTES.acSetupTasks(acId)}
					>
						Aufgaben prüfen
					</Link>
					<Link
						className="text-primary text-sm underline underline-offset-4"
						href={ROUTES.acSetupAssignments(acId)}
					>
						Zuweisungen prüfen
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

type GroupCardProps = {
	group: EvaluationOverviewData["groups"][number];
};

function GroupCard({ group }: GroupCardProps) {
	return (
		<Card>
			<CardHeader className="gap-3">
				<div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
					<div className="space-y-1">
						<CardTitle className="text-base">{group.name}</CardTitle>
						<p className="text-muted-foreground text-sm">
							{group.participants.length} Teilnehmer, {group.tasks.length}{" "}
							Aufgaben
						</p>
					</div>
					<Badge
						variant={group.completionPercent === 100 ? "default" : "secondary"}
					>
						{group.completionPercent}% abgeschlossen
					</Badge>
				</div>
				<div className="flex items-center justify-between gap-3 text-sm">
					<span className="font-medium">Gruppenfortschritt</span>
					<span className="text-muted-foreground">
						{group.completionPercent}%
					</span>
				</div>
				<Progress className="w-full" value={group.completionPercent} />
			</CardHeader>
			<CardContent>
				{group.participants.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Dieser Gruppe sind noch keine Teilnehmer zugeordnet.
					</p>
				) : group.tasks.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Für diese Gruppe liegen noch keine geplanten oder zugewiesenen
						Aufgaben vor.
					</p>
				) : (
					<GroupMatrixTable group={group} />
				)}
			</CardContent>
		</Card>
	);
}

function GroupMatrixTable({ group }: GroupCardProps) {
	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="min-w-44">Teilnehmer</TableHead>
						{group.tasks.map((task) => (
							<TableHead className="min-w-44 align-top" key={task.id}>
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<span className="font-medium text-foreground">
											{task.name}
										</span>
										<Badge variant={task.isTeamTask ? "secondary" : "outline"}>
											{task.isTeamTask ? "Team" : "Einzeln"}
										</Badge>
									</div>
									<p className="text-muted-foreground text-xs">
										{formatTaskMeta(task.criteriaCount, task.scheduledDates)}
									</p>
								</div>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{group.participants.map((participant) => (
						<TableRow key={participant.id}>
							<TableCell className="font-medium">{participant.name}</TableCell>
							{group.tasks.map((task) => {
								const taskSummary = participant.tasks.find(
									(entry) => entry.taskId === task.id,
								);

								return (
									<TableCell className="align-top" key={task.id}>
										<TaskProgressBadge
											completedAssignments={
												taskSummary?.completedAssignments ?? 0
											}
											criteriaCount={task.criteriaCount}
											totalAssignments={taskSummary?.totalAssignments ?? 0}
										/>
									</TableCell>
								);
							})}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

type TaskProgressBadgeProps = {
	totalAssignments: number;
	completedAssignments: number;
	criteriaCount: number;
};

function TaskProgressBadge({
	totalAssignments,
	completedAssignments,
	criteriaCount,
}: TaskProgressBadgeProps) {
	if (totalAssignments === 0) {
		return <Badge variant="outline">Nicht zugewiesen</Badge>;
	}

	if (criteriaCount === 0) {
		return <Badge variant="outline">Keine Kriterien</Badge>;
	}

	if (completedAssignments === 0) {
		return <Badge variant="destructive">0 / {totalAssignments} fertig</Badge>;
	}

	if (completedAssignments === totalAssignments) {
		return (
			<Badge>
				{completedAssignments} / {totalAssignments} fertig
			</Badge>
		);
	}

	return (
		<Badge variant="secondary">
			{completedAssignments} / {totalAssignments} fertig
		</Badge>
	);
}

function formatTaskMeta(criteriaCount: number, scheduledDates: Date[]) {
	const criteriaLabel =
		criteriaCount === 1 ? "1 Kriterium" : `${criteriaCount} Kriterien`;

	if (scheduledDates.length === 0) {
		return `${criteriaLabel} · nicht eingeplant`;
	}

	const dates = scheduledDates
		.map((date) =>
			date.toLocaleDateString("de-DE", {
				day: "2-digit",
				month: "2-digit",
			}),
		)
		.join(", ");

	return `${criteriaLabel} · ${dates}`;
}

function OverviewEmptyState({ acId }: { acId: string }) {
	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<Card className="max-w-xl">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						Noch keine Übersicht verfügbar
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-muted-foreground text-sm">
						Für dieses Assessment Center gibt es noch keine Gruppen, Teilnehmer
						oder Aufgaben mit Zuweisungen. Die Live-Übersicht wird sichtbar,
						sobald die Einrichtung vollständig ist.
					</p>
					<Link
						className="text-primary text-sm underline underline-offset-4"
						href={ROUTES.acSetup(acId)}
					>
						Zur Einrichtung
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}

export { EvaluationOverview };
