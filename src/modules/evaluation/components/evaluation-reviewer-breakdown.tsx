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
import type { ReviewerBreakdownData } from "../server/get-participant-reviewer-breakdown";

function formatScore(value: number | null): string {
	return value === null ? "–" : value.toFixed(2);
}

function getScoreForAxis(
	scores: ReviewerBreakdownData["reviewers"][number]["scores"],
	axisId: string,
): number | null {
	return scores.find((s) => s.axisId === axisId)?.score ?? null;
}

function ReviewerBreakdownCard({ data }: { data: ReviewerBreakdownData }) {
	if (data.reviewers.length === 0 || data.axisGroups.length === 0) {
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
					Einzelwertung je Beobachter und Kriteriengruppe
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-48">Kriteriengruppe</TableHead>
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
							{data.axisGroups.map((group) => (
								<TableRow key={group.axisId}>
									<TableCell>
										<p className="font-medium text-sm">
											{group.criteriaGroupTitle}
										</p>
										<p className="text-muted-foreground text-xs">
											{group.taskName}
										</p>
									</TableCell>
									{data.reviewers.map((reviewer) => {
										const score = getScoreForAxis(
											reviewer.scores,
											group.axisId,
										);
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
													{formatScore(score)}
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
