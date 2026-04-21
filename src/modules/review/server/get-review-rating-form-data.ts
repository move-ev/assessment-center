import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCompletedCriteriaCount, getReviewSession } from "./shared";

export type ReviewRatingFormData = {
	task: {
		id: string;
		name: string;
		description: string | null;
		isTeamTask: boolean;
	};
	participant: {
		id: string;
		name: string;
		group: {
			id: string;
			name: string;
		} | null;
	};
	progress: {
		completedCriteriaCount: number;
		totalCriteriaCount: number;
	};
	criteriaGroups: Array<{
		id: string;
		title: string;
		factorType: "POTENTIAL" | "COMPETENCE";
		criteria: Array<
			| {
					id: string;
					name: string;
					description: string | null;
					type: "QUANTITATIVE";
					weight: number;
					value: number | null;
					notes: string;
			  }
			| {
					id: string;
					name: string;
					description: string | null;
					type: "QUALITATIVE";
					text: string;
			  }
		>;
	}>;
	teamObservation: {
		enabled: boolean;
		notes: string;
	};
};

export async function getReviewRatingFormData(
	acId: string,
	taskId: string,
	participantId: string,
): Promise<ReviewRatingFormData> {
	const reviewSession = await getReviewSession(acId);

	const assignment = await db.reviewerAssignment.findFirst({
		where: {
			reviewerId: reviewSession.reviewerId,
			taskId,
			participantId,
		},
		select: {
			id: true,
			reviewerId: true,
			task: {
				select: {
					id: true,
					name: true,
					description: true,
					isTeamTask: true,
					criteriaGroups: {
						where: { deletedAt: null },
						select: {
							id: true,
							title: true,
							factorType: true,
							criteria: {
								where: { deletedAt: null },
								select: {
									id: true,
									name: true,
									description: true,
									type: true,
									weight: true,
								},
								orderBy: { createdAt: "asc" },
							},
						},
						orderBy: { createdAt: "asc" },
					},
				},
			},
			participant: {
				select: {
					id: true,
					name: true,
					groupMemberships: {
						select: {
							group: {
								select: {
									id: true,
									name: true,
								},
							},
						},
						orderBy: { createdAt: "asc" },
						take: 1,
					},
				},
			},
			quantitativeRatings: {
				where: { deletedAt: null },
				select: {
					criteriaId: true,
					value: true,
					notes: true,
				},
			},
			qualitativeRatings: {
				where: { deletedAt: null },
				select: {
					criteriaId: true,
					text: true,
				},
			},
		},
	});

	if (!assignment) {
		notFound();
	}

	const quantitativeRatings = new Map(
		assignment.quantitativeRatings.map((rating) => [rating.criteriaId, rating]),
	);
	const qualitativeRatings = new Map(
		assignment.qualitativeRatings.map((rating) => [rating.criteriaId, rating]),
	);
	const group = assignment.participant.groupMemberships[0]?.group ?? null;
	const teamObservation =
		assignment.task.isTeamTask && group
			? await db.teamTaskObservation.findFirst({
					where: {
						taskId,
						groupId: group.id,
						reviewerId: assignment.reviewerId,
						deletedAt: null,
					},
					select: { notes: true },
				})
			: null;

	return {
		task: {
			id: assignment.task.id,
			name: assignment.task.name,
			description: assignment.task.description,
			isTeamTask: assignment.task.isTeamTask,
		},
		participant: {
			id: assignment.participant.id,
			name: assignment.participant.name,
			group,
		},
		progress: {
			completedCriteriaCount: getCompletedCriteriaCount(assignment),
			totalCriteriaCount: assignment.task.criteriaGroups.reduce(
				(count, group) => count + group.criteria.length,
				0,
			),
		},
		criteriaGroups: assignment.task.criteriaGroups.map((group) => ({
			id: group.id,
			title: group.title,
			factorType: group.factorType,
			criteria: group.criteria.map((criteria) => {
				if (criteria.type === "QUANTITATIVE") {
					const rating = quantitativeRatings.get(criteria.id);
					return {
						id: criteria.id,
						name: criteria.name,
						description: criteria.description,
						type: "QUANTITATIVE" as const,
						weight: criteria.weight ?? 0,
						value: rating?.value ?? null,
						notes: rating?.notes ?? "",
					};
				}

				const rating = qualitativeRatings.get(criteria.id);
				return {
					id: criteria.id,
					name: criteria.name,
					description: criteria.description,
					type: "QUALITATIVE" as const,
					text: rating?.text ?? "",
				};
			}),
		})),
		teamObservation: {
			enabled: assignment.task.isTeamTask,
			notes: teamObservation?.notes ?? "",
		},
	};
}
