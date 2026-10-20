import { UserRound } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatPercent } from "@/lib/format-percent";
import type { ReviewerBreakdownData } from "../server/get-participant-reviewer-breakdown";

function getScoreForTask(
	scores: ReviewerBreakdownData["reviewers"][number]["scores"],
	taskId: string,
): number | null {
	return scores.find((s) => s.taskId === taskId)?.score ?? null;
}

function ReviewerBreakdownCard({ data }: { data: ReviewerBreakdownData }) {
	if (data.reviewers.length === 0 || data.tasks.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UserRound className="h-4 w-4 text-muted-foreground" />
					Bewertungen nach Beobachter
				</CardTitle>
				<CardDescription>
					Teil-Score je Aufgabe aus den Bewertungen eines Beobachters
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-48">Aufgabe</TableHead>
								{data.reviewers.map((reviewer) => (
									<TableHead
										className="min-w-28 text-right"
										key={reviewer.reviewerId}
									>
										{reviewer.reviewerName}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.tasks.map((task) => (
								<TableRow key={task.taskId}>
									<TableCell className="font-medium">{task.taskName}</TableCell>
									{data.reviewers.map((reviewer) => {
										const score = getScoreForTask(reviewer.scores, task.taskId);
										return (
											<TableCell
												className="text-right font-mono tabular-nums"
												key={reviewer.reviewerId}
											>
												<span
													className={
														score === null ? "text-muted-foreground" : undefined
													}
												>
													{formatPercent(score)}
												</span>
											</TableCell>
										);
									})}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

export { ReviewerBreakdownCard };
