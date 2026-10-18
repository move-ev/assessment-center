import "server-only";

import { z } from "zod";
import {
	type CompletionCriterion,
	getAssignmentCompletion,
} from "@/lib/review-completion";
import { db } from "@/server/db";
import {
	computeWeightedCriteriaScore,
	computeWeightedMean,
	roundScore,
	type WeightedCriterion,
} from "./scoring";

const factorTypeSchema = z.enum(["COMPETENCE", "POTENTIAL"]);

const participantDashboardGroupScoreSchema = z.object({
	axisId: z.string(),
	taskId: z.string(),
	taskName: z.string(),
	criteriaGroupId: z.string(),
	criteriaGroupTitle: z.string(),
	factorType: factorTypeSchema,
	criteriaCount: z.number().int().nonnegative(),
	weightTotal: z.number().nonnegative(),
	participantScore: z.number().nullable(),
	benchmarkScore: z.number().nullable(),
});

const participantDashboardParticipantSchema = z.object({
	id: z.string(),
	name: z.string(),
	groupName: z.string().nullable(),
	overallScore: z.number().nullable(),
	completedAssignmentCount: z.number().int().nonnegative(),
	totalAssignmentCount: z.number().int().nonnegative(),
	scoredGroupCount: z.number().int().nonnegative(),
	totalGroupCount: z.number().int().nonnegative(),
	groups: z.array(participantDashboardGroupScoreSchema),
});

export const participantDashboardSnapshotSchema = z.object({
	// v2: overall score weighted by task weight. Older snapshots fail to parse
	// and are rebuilt from the (locked) ratings when read.
	version: z.literal(2),
	createdAt: z.string().datetime(),
	participants: z.array(participantDashboardParticipantSchema),
});

type FactorType = z.infer<typeof factorTypeSchema>;

type QuantitativeGroupDefinition = {
	axisId: string;
	taskId: string;
	taskName: string;
	criteriaGroupId: string;
	criteriaGroupTitle: string;
	factorType: FactorType;
	criteriaCount: number;
	weightTotal: number;
	criteria: Array<{
		id: string;
		weight: number;
	}>;
};

type TaskDefinition = {
	id: string;
	name: string;
	scoreWeight: number;
	criteria: CompletionCriterion[];
	/** Same criteria, order and filter as the task score on the results page. */
	scoredCriteria: WeightedCriterion[];
	quantitativeGroups: QuantitativeGroupDefinition[];
};

type SnapshotSource = NonNullable<
	Awaited<ReturnType<typeof fetchParticipantDashboardSnapshotSource>>
>;

export type ParticipantDashboardSnapshot = z.infer<
	typeof participantDashboardSnapshotSchema
>;

async function fetchParticipantDashboardSnapshotSource(acId: string) {
	return db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: {
			id: true,
			tasks: {
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					scoreWeight: true,
					criteriaGroups: {
						where: { deletedAt: null },
						select: {
							id: true,
							title: true,
							factorType: true,
							criteria: {
								where: { deletedAt: null, type: "QUANTITATIVE" },
								select: {
									id: true,
									weight: true,
								},
								orderBy: { createdAt: "asc" },
							},
						},
						orderBy: { createdAt: "asc" },
					},
					criteria: {
						where: { deletedAt: null },
						select: { id: true, type: true, isOptional: true, weight: true },
						orderBy: { createdAt: "asc" },
					},
				},
				orderBy: { createdAt: "asc" },
			},
			participants: {
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					groupMemberships: {
						select: {
							group: {
								select: {
									name: true,
								},
							},
						},
						orderBy: { createdAt: "asc" },
						take: 1,
					},
					reviewerAssignments: {
						where: {
							reviewer: {
								assessmentCenterId: acId,
							},
						},
						select: {
							taskId: true,
							quantitativeRatings: {
								where: { deletedAt: null },
								select: {
									criteriaId: true,
									value: true,
								},
							},
							qualitativeRatings: {
								where: { deletedAt: null },
								select: {
									criteriaId: true,
								},
							},
						},
						orderBy: { createdAt: "asc" },
					},
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});
}

function buildTaskDefinitions(source: SnapshotSource) {
	return source.tasks.map((task) => ({
		id: task.id,
		name: task.name,
		scoreWeight: task.scoreWeight,
		criteria: task.criteria,
		scoredCriteria: task.criteria.flatMap((criterion) =>
			criterion.type === "QUANTITATIVE" && criterion.weight !== null
				? [{ id: criterion.id, weight: criterion.weight }]
				: [],
		),
		quantitativeGroups: task.criteriaGroups
			.map((group) => {
				const criteria = group.criteria.flatMap((criterion) => {
					if (criterion.weight === null) {
						return [];
					}

					return [{ id: criterion.id, weight: criterion.weight }];
				});

				if (criteria.length === 0) {
					return null;
				}

				return {
					axisId: `${task.id}:${group.id}`,
					taskId: task.id,
					taskName: task.name,
					criteriaGroupId: group.id,
					criteriaGroupTitle: group.title,
					factorType: group.factorType,
					criteriaCount: criteria.length,
					weightTotal: criteria.reduce(
						(sum, criterion) => sum + criterion.weight,
						0,
					),
					criteria,
				} satisfies QuantitativeGroupDefinition;
			})
			.filter((group) => group !== null),
	})) satisfies TaskDefinition[];
}

function buildTaskLookup(taskDefinitions: TaskDefinition[]) {
	return new Map(taskDefinitions.map((task) => [task.id, task]));
}

function buildParticipantGroupScores(
	assignments: SnapshotSource["participants"][number]["reviewerAssignments"],
	taskDefinitions: TaskDefinition[],
) {
	return taskDefinitions.flatMap((task) => {
		const ratingSets = getTaskRatingSets(assignments, task.id);

		return task.quantitativeGroups.map((group) => ({
			axisId: group.axisId,
			taskId: group.taskId,
			taskName: group.taskName,
			criteriaGroupId: group.criteriaGroupId,
			criteriaGroupTitle: group.criteriaGroupTitle,
			factorType: group.factorType,
			criteriaCount: group.criteriaCount,
			weightTotal: group.weightTotal,
			participantScore: computeWeightedCriteriaScore(
				group.criteria,
				ratingSets,
			),
		}));
	});
}

function buildBenchmarkScores(
	participants: Array<{
		groups: Array<{
			axisId: string;
			participantScore: number | null;
		}>;
	}>,
) {
	const scoresByAxis = new Map<string, number[]>();

	for (const participant of participants) {
		for (const group of participant.groups) {
			if (group.participantScore === null) {
				continue;
			}

			const scores = scoresByAxis.get(group.axisId) ?? [];
			scores.push(group.participantScore);
			scoresByAxis.set(group.axisId, scores);
		}
	}

	return new Map(
		Array.from(scoresByAxis.entries()).map(([axisId, scores]) => [
			axisId,
			roundScore(scores.reduce((sum, score) => sum + score, 0) / scores.length),
		]),
	);
}

function getTaskRatingSets(
	assignments: SnapshotSource["participants"][number]["reviewerAssignments"],
	taskId: string,
) {
	return assignments
		.filter((assignment) => assignment.taskId === taskId)
		.map((assignment) => assignment.quantitativeRatings);
}

/** Overall score: task scores weighted by task weight, as on the results page. */
function buildOverallScore(
	assignments: SnapshotSource["participants"][number]["reviewerAssignments"],
	taskDefinitions: TaskDefinition[],
) {
	return computeWeightedMean(
		taskDefinitions.map((task) => ({
			score: computeWeightedCriteriaScore(
				task.scoredCriteria,
				getTaskRatingSets(assignments, task.id),
			),
			weight: task.scoreWeight,
		})),
	);
}

function buildParticipantDashboardSnapshotDocument(source: SnapshotSource) {
	const taskDefinitions = buildTaskDefinitions(source);
	const taskLookup = buildTaskLookup(taskDefinitions);
	const participants = source.participants.map((participant) => {
		const groups = buildParticipantGroupScores(
			participant.reviewerAssignments,
			taskDefinitions,
		);
		const completedAssignmentCount = participant.reviewerAssignments.filter(
			(assignment) => {
				const task = taskLookup.get(assignment.taskId);
				if (!task) {
					return false;
				}

				return getAssignmentCompletion(task.criteria, assignment).isComplete;
			},
		).length;

		return {
			id: participant.id,
			name: participant.name,
			groupName: participant.groupMemberships[0]?.group.name ?? null,
			overallScore: buildOverallScore(
				participant.reviewerAssignments,
				taskDefinitions,
			),
			completedAssignmentCount,
			totalAssignmentCount: participant.reviewerAssignments.length,
			scoredGroupCount: groups.filter(
				(group) => group.participantScore !== null,
			).length,
			totalGroupCount: groups.length,
			groups,
		};
	});
	const benchmarkScores = buildBenchmarkScores(participants);

	return participantDashboardSnapshotSchema.parse({
		version: 2,
		createdAt: new Date().toISOString(),
		participants: participants.map((participant) => ({
			...participant,
			groups: participant.groups.map((group) => ({
				...group,
				benchmarkScore: benchmarkScores.get(group.axisId) ?? null,
			})),
		})),
	});
}

export async function buildParticipantDashboardSnapshot(
	acId: string,
): Promise<ParticipantDashboardSnapshot> {
	const source = await fetchParticipantDashboardSnapshotSource(acId);

	if (!source) {
		throw new Error(`Assessment center ${acId} not found`);
	}

	return buildParticipantDashboardSnapshotDocument(source);
}

export function parseParticipantDashboardSnapshot(
	value: unknown,
): ParticipantDashboardSnapshot | null {
	const result = participantDashboardSnapshotSchema.safeParse(value);
	return result.success ? result.data : null;
}
