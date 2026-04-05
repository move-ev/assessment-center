import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ROUTES } from "@/lib/routes";
import type { ReviewTaskListItem } from "../server/get-review-task-list-data";

type Props = {
	acId: string;
	tasks: ReviewTaskListItem[];
};

function ReviewTaskList({ acId, tasks }: Props) {
	return (
		<div className="space-y-6 p-6">
			<header className="space-y-1">
				<h1 className="font-medium text-xl">Meine Aufgaben</h1>
				<p className="text-muted-foreground text-sm">
					Öffne eine Aufgabe, um zugewiesene Teilnehmer zu bewerten.
				</p>
			</header>

			{tasks.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Du hast aktuell keine Bewertungsaufgaben in diesem Assessment Center.
				</p>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{tasks.map((task) => (
						<TaskCard acId={acId} key={task.id} task={task} />
					))}
				</div>
			)}
		</div>
	);
}

function TaskCard({ acId, task }: { acId: string; task: ReviewTaskListItem }) {
	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader className="gap-3">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1">
						<CardTitle className="text-base">{task.name}</CardTitle>
						<p className="text-muted-foreground text-sm">
							{task.participantCount} Teilnehmer, {task.criteriaCount} Kriterien
						</p>
					</div>
					<Badge variant={task.isTeamTask ? "secondary" : "outline"}>
						{task.isTeamTask ? "Team" : "Einzeln"}
					</Badge>
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span>Fortschritt</span>
						<span className="text-muted-foreground">
							{task.completedParticipantCount} / {task.participantCount}
						</span>
					</div>
					<Progress value={task.progressPercent} />
				</div>
			</CardHeader>
			<CardContent>
				<Link
					className="text-primary text-sm underline underline-offset-4"
					href={ROUTES.acReviewTask(acId, task.id)}
				>
					Teilnehmer öffnen
				</Link>
			</CardContent>
		</Card>
	);
}

export { ReviewTaskList };
