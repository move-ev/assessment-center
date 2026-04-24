import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/routes";
import type { ReviewParticipantListData } from "../server/get-review-participant-list-data";

type Props = {
	acId: string;
	taskId: string;
	data: ReviewParticipantListData;
};

const STATUS_LABEL = {
	NOT_STARTED: "Offen",
	IN_PROGRESS: "In Arbeit",
	COMPLETED: "Fertig",
	NO_CRITERIA: "Keine Kriterien",
} as const;

const STATUS_VARIANT = {
	NOT_STARTED: "destructive",
	IN_PROGRESS: "secondary",
	COMPLETED: "default",
	NO_CRITERIA: "outline",
} as const;

function ReviewParticipantList({ acId, taskId, data }: Props) {
	return (
		<div className="space-y-6 p-6">
			<header className="space-y-1">
				<h1 className="font-medium text-xl">{data.task.name}</h1>
				<p className="text-muted-foreground text-sm">
					{data.participants.length} Bewerbende zugewiesen,{" "}
					{data.task.criteriaCount} Kriterien pro Bewertung.
				</p>
			</header>

			{data.participants.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Für diese Aufgabe liegen keine Zuweisungen von Bewerbenden vor.
				</p>
			) : (
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Bewerbende</TableHead>
								<TableHead>Gruppe</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Fortschritt</TableHead>
								<TableHead className="w-32" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.participants.map((participant) => (
								<TableRow key={participant.id}>
									<TableCell className="font-medium">
										{participant.name}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{participant.groupName ?? "Keine Gruppe"}
									</TableCell>
									<TableCell>
										<Badge variant={STATUS_VARIANT[participant.status]}>
											{STATUS_LABEL[participant.status]}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{participant.criteriaCount === 0
											? "–"
											: `${participant.completedCriteriaCount} / ${participant.criteriaCount}`}
									</TableCell>
									<TableCell>
										<Link
											className="text-primary text-sm underline underline-offset-4"
											href={ROUTES.acReviewRating(acId, taskId, participant.id)}
										>
											Bewerten
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

export { ReviewParticipantList };
