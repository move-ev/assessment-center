"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ROUTES } from "@/lib/routes";
import type { ReviewRatingFormData } from "../server/get-review-rating-form-data";
import { ReviewQualitativeField } from "./review-qualitative-field";
import { ReviewQuantitativeField } from "./review-quantitative-field";
import { ReviewTeamObservation } from "./review-team-observation";

type Props = {
	acId: string;
	taskId: string;
	data: ReviewRatingFormData;
};

function ReviewRatingForm({ acId, taskId, data }: Props) {
	const [completion, setCompletion] = useState(
		() =>
			new Map(
				data.criteriaGroups.flatMap((group) =>
					group.criteria.map((criteria) => [
						criteria.id,
						criteria.type === "QUANTITATIVE"
							? criteria.value !== null
							: criteria.text.trim() !== "",
					]),
				),
			),
	);

	const completedCriteriaCount = Array.from(completion.values()).filter(
		Boolean,
	).length;
	const progressPercent =
		data.progress.totalCriteriaCount === 0
			? 0
			: Math.round(
					(completedCriteriaCount / data.progress.totalCriteriaCount) * 100,
				);

	const handlePersisted = useCallback(
		(criteriaId: string, isComplete: boolean) => {
			setCompletion((current) => {
				const previousValue = current.get(criteriaId);
				if (previousValue === isComplete) {
					return current;
				}

				const next = new Map(current);
				next.set(criteriaId, isComplete);
				return next;
			});
		},
		[],
	);

	return (
		<div className="space-y-6 p-6">
			<header className="space-y-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<h1 className="font-medium text-xl">{data.participant.name}</h1>
						<p className="text-muted-foreground text-sm">
							{data.task.name}
							{data.participant.group
								? ` · ${data.participant.group.name}`
								: ""}
						</p>
					</div>
					<Link
						className="text-primary text-sm underline underline-offset-4"
						href={ROUTES.acReviewTask(acId, taskId)}
					>
						Zur Teilnehmerliste
					</Link>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant={data.task.isTeamTask ? "secondary" : "outline"}>
						{data.task.isTeamTask ? "Teamaufgabe" : "Einzelaufgabe"}
					</Badge>
					<Badge variant="outline">
						{completedCriteriaCount} / {data.progress.totalCriteriaCount}{" "}
						Kriterien
					</Badge>
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="font-medium">Formularfortschritt</span>
						<span className="text-muted-foreground">{progressPercent}%</span>
					</div>
					<Progress value={progressPercent} />
				</div>
				{data.task.description && (
					<p className="text-muted-foreground text-sm">
						{data.task.description}
					</p>
				)}
			</header>

			{data.criteriaGroups.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Für diese Aufgabe sind noch keine Kriterien hinterlegt.
				</p>
			) : (
				<div className="space-y-4">
					{data.criteriaGroups.map((group) => (
						<section
							className="space-y-3 rounded-3xl border p-4"
							key={group.id}
						>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="font-medium text-base">{group.title}</h2>
								<Badge
									variant={
										group.factorType === "POTENTIAL" ? "secondary" : "outline"
									}
								>
									{group.factorType === "POTENTIAL"
										? "Potenzial-Faktoren"
										: "Kompetenz-Faktoren"}
								</Badge>
							</div>
							<div className="space-y-4">
								{group.criteria.map((criteria) =>
									criteria.type === "QUANTITATIVE" ? (
										<ReviewQuantitativeField
											acId={acId}
											criterion={criteria}
											key={criteria.id}
											onPersisted={handlePersisted}
											participantId={data.participant.id}
											taskId={taskId}
										/>
									) : (
										<ReviewQualitativeField
											acId={acId}
											criterion={criteria}
											key={criteria.id}
											onPersisted={handlePersisted}
											participantId={data.participant.id}
											taskId={taskId}
										/>
									),
								)}
							</div>
						</section>
					))}
				</div>
			)}

			{data.teamObservation.enabled && (
				<ReviewTeamObservation
					acId={acId}
					groupName={data.participant.group?.name ?? null}
					initialNotes={data.teamObservation.notes}
					participantId={data.participant.id}
					taskId={taskId}
				/>
			)}
		</div>
	);
}

export { ReviewRatingForm };
