import "server-only";

import { z } from "zod";
import { db } from "@/server/db";
import { isAssignmentComplete, roundScore } from "./shared";

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
	version: z.literal(1),
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
	criteriaCount: number;
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
						select: { id: true },
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
		criteriaCount: task.criteria.length,
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

function getCriterionAverage(
	assignments: SnapshotSource["participants"][number]["reviewerAssignments"],
	taskId: string,
	criteriaId: string,
) {
	const values = assignments.flatMap((assignment) => {
		if (assignment.taskId !== taskId) {
			return [];
		}

		return assignment.quantitativeRatings
			.filter((rating) => rating.criteriaId === criteriaId)
			.map((rating) => rating.value);
	});

	if (values.length === 0) {
		return null;
	}

	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildParticipantGroupScores(
	assignments: SnapshotSource["participants"][number]["reviewerAssignments"],
	taskDefinitions: TaskDefinition[],
) {
	return taskDefinitions.flatMap((task) =>
		task.quantitativeGroups.map((group) => {
			let weightedValueSum = 0;
			let weightSum = 0;

			for (const criterion of group.criteria) {
				const criterionAverage = getCriterionAverage(
					assignments,
					task.id,
					criterion.id,
				);
				if (criterionAverage === null) {
					continue;
				}

				weightedValueSum += criterionAverage * criterion.weight;
				weightSum += criterion.weight;
			}

			return {
				axisId: group.axisId,
				taskId: group.taskId,
				taskName: group.taskName,
				criteriaGroupId: group.criteriaGroupId,
				criteriaGroupTitle: group.criteriaGroupTitle,
				factorType: group.factorType,
				criteriaCount: group.criteriaCount,
				weightTotal: group.weightTotal,
				participantScore:
					weightSum === 0 ? null : roundScore(weightedValueSum / weightSum),
			};
		}),
	);
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

function buildOverallScore(
	groups: Array<{
		participantScore: number | null;
		weightTotal: number;
	}>,
) {
	let weightedValueSum = 0;
	let weightSum = 0;

	for (const group of groups) {
		if (group.participantScore === null || group.weightTotal <= 0) {
			continue;
		}

		weightedValueSum += group.participantScore * group.weightTotal;
		weightSum += group.weightTotal;
	}

	return weightSum === 0 ? null : roundScore(weightedValueSum / weightSum);
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

				return isAssignmentComplete(assignment, task.criteriaCount);
			},
		).length;

		return {
			id: participant.id,
			name: participant.name,
			groupName: participant.groupMemberships[0]?.group.name ?? null,
			overallScore: buildOverallScore(groups),
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
		version: 1,
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
