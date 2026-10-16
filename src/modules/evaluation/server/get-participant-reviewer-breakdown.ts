import "server-only";

import { db } from "@/server/db";
import {
	computeWeightedCriteriaScore,
	type WeightedCriterion,
} from "./scoring";

export type ReviewerGroupScore = {
	axisId: string;
	score: number | null;
};

export type ReviewerEntry = {
	reviewerId: string;
	reviewerName: string;
	scores: ReviewerGroupScore[];
};

export type ReviewerBreakdownData = {
	axisGroups: Array<{
		axisId: string;
		taskName: string;
		criteriaGroupTitle: string;
	}>;
	reviewers: ReviewerEntry[];
};

type GroupDefinition = {
	axisId: string;
	taskName: string;
	criteriaGroupTitle: string;
	taskId: string;
	criteria: WeightedCriterion[];
};

function buildGroupDefinitions(
	tasks: Array<{
		id: string;
		name: string;
		criteriaGroups: Array<{
			id: string;
			title: string;
			criteria: Array<{ id: string; weight: number | null }>;
		}>;
	}>,
): GroupDefinition[] {
	return tasks.flatMap((task) =>
		task.criteriaGroups.flatMap((group) => {
			const criteria = group.criteria.flatMap((c) =>
				c.weight !== null ? [{ id: c.id, weight: c.weight }] : [],
			);

			if (criteria.length === 0) {
				return [];
			}

			return [
				{
					axisId: `${task.id}:${group.id}`,
					taskName: task.name,
					criteriaGroupTitle: group.title,
					taskId: task.id,
					criteria,
				},
			];
		}),
	);
}

export async function getParticipantReviewerBreakdown(
	acId: string,
	participantId: string,
): Promise<ReviewerBreakdownData> {
	const [acData, assignments] = await Promise.all([
		db.assessmentCenter.findFirst({
			where: { id: acId, deletedAt: null },
			select: {
				tasks: {
					where: { deletedAt: null },
					select: {
						id: true,
						name: true,
						criteriaGroups: {
							where: { deletedAt: null },
							select: {
								id: true,
								title: true,
								criteria: {
									where: { deletedAt: null, type: "QUANTITATIVE" },
									select: { id: true, weight: true },
									orderBy: { createdAt: "asc" },
								},
							},
							orderBy: { createdAt: "asc" },
						},
					},
					orderBy: { createdAt: "asc" },
				},
			},
		}),
		db.reviewerAssignment.findMany({
			where: {
				participantId,
				reviewer: { assessmentCenterId: acId },
			},
			select: {
				taskId: true,
				reviewer: {
					select: {
						id: true,
						user: { select: { name: true } },
					},
				},
				quantitativeRatings: {
					where: { deletedAt: null },
					select: { criteriaId: true, value: true },
				},
			},
			orderBy: { createdAt: "asc" },
		}),
	]);

	if (!acData) {
		return { axisGroups: [], reviewers: [] };
	}

	const groupDefinitions = buildGroupDefinitions(acData.tasks);
	const axisGroups = groupDefinitions.map(
		({ axisId, taskName, criteriaGroupTitle }) => ({
			axisId,
			taskName,
			criteriaGroupTitle,
		}),
	);

	type ReviewerAccumulator = {
		reviewerId: string;
		reviewerName: string;
		ratingsByTask: Map<string, Array<{ criteriaId: string; value: number }>>;
	};

	const reviewerMap = new Map<string, ReviewerAccumulator>();

	for (const assignment of assignments) {
		const { reviewer, taskId, quantitativeRatings } = assignment;
		const entry = reviewerMap.get(reviewer.id) ?? {
			reviewerId: reviewer.id,
			reviewerName: reviewer.user.name,
			ratingsByTask: new Map(),
		};

		entry.ratingsByTask.set(taskId, quantitativeRatings);
		reviewerMap.set(reviewer.id, entry);
	}

	const reviewers: ReviewerEntry[] = Array.from(reviewerMap.values()).map(
		(reviewer) => ({
			reviewerId: reviewer.reviewerId,
			reviewerName: reviewer.reviewerName,
			scores: groupDefinitions.map((group) => {
				const ratings = reviewer.ratingsByTask.get(group.taskId) ?? [];
				return {
					axisId: group.axisId,
					score: computeWeightedCriteriaScore(group.criteria, [ratings]),
				};
			}),
		}),
	);

	return { axisGroups, reviewers };
}
