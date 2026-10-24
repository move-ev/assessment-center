import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { OpenReview } from "../server/get-evaluation-overview";

type Props = {
	openReviews: OpenReview[];
};

export const OPEN_REVIEWS_ANCHOR = "offene-bewertungen";

function OpenReviewsList({ openReviews }: Props) {
	const byReviewer = groupByReviewer(openReviews);

	return (
		<Card id={OPEN_REVIEWS_ANCHOR}>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">Offene Bewertungen</CardTitle>
				<p className="text-muted-foreground text-sm">
					{openReviews.length === 0
						? "Alle zugewiesenen Bewertungen sind vollständig."
						: `${openReviews.length} offen bei ${byReviewer.length} ${byReviewer.length === 1 ? "Bewerter" : "Bewertern"}`}
				</p>
			</CardHeader>
			{openReviews.length > 0 && (
				<CardContent className="space-y-3">
					{byReviewer.map((reviewer) => (
						<details className="group rounded-md border" key={reviewer.id} open>
							<summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2">
								<span className="font-medium">{reviewer.name}</span>
								<Badge variant="secondary">
									{reviewer.reviews.length} offen
								</Badge>
							</summary>
							<div className="overflow-x-auto border-t">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="min-w-40">Bewerbende</TableHead>
											<TableHead className="min-w-40">Aufgabe</TableHead>
											<TableHead className="min-w-28">Stand</TableHead>
											<TableHead className="min-w-64">
												Fehlende Kriterien
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{reviewer.reviews.map((review) => (
											<TableRow key={review.assignmentId}>
												<TableCell className="align-top">
													<div className="font-medium">
														{review.participantName}
													</div>
													{review.groupName && (
														<div className="text-muted-foreground text-xs">
															{review.groupName}
														</div>
													)}
												</TableCell>
												<TableCell className="align-top">
													{review.taskName}
												</TableCell>
												<TableCell className="align-top">
													<OpenReviewStatus review={review} />
												</TableCell>
												<TableCell className="whitespace-normal align-top">
													<MissingCriteria review={review} />
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</details>
					))}
				</CardContent>
			)}
		</Card>
	);
}

function OpenReviewStatus({ review }: { review: OpenReview }) {
	if (review.status === "NOT_STARTED") {
		return <Badge variant="destructive">Nicht begonnen</Badge>;
	}

	if (review.requiredCount === 0) {
		return <Badge variant="secondary">Begonnen</Badge>;
	}

	return (
		<Badge variant="secondary">
			{review.completedRequiredCount} / {review.requiredCount} Kriterien
		</Badge>
	);
}

function MissingCriteria({ review }: { review: OpenReview }) {
	if (review.missingCriteria.length === 0) {
		return (
			<span className="text-muted-foreground text-sm">
				Keine Pflichtkriterien, noch kein Eintrag
			</span>
		);
	}

	return (
		<div className="flex flex-wrap gap-1">
			{review.missingCriteria.map((criterion) => (
				<Badge key={criterion.id} variant="outline">
					{criterion.name}
				</Badge>
			))}
		</div>
	);
}

type ReviewerOpenReviews = {
	id: string;
	name: string;
	reviews: OpenReview[];
};

function groupByReviewer(openReviews: OpenReview[]): ReviewerOpenReviews[] {
	const byId = new Map<string, ReviewerOpenReviews>();

	for (const review of openReviews) {
		const reviewer = byId.get(review.reviewerId) ?? {
			id: review.reviewerId,
			name: review.reviewerName,
			reviews: [],
		};
		reviewer.reviews.push(review);
		byId.set(review.reviewerId, reviewer);
	}

	return Array.from(byId.values());
}

export { OpenReviewsList };
