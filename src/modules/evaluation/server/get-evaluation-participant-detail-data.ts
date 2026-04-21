import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { isAssignmentComplete, roundScore } from "./shared";

type CriteriaType = "QUANTITATIVE" | "QUALITATIVE";

type DetailAssignment = {
	id: string;
	reviewer: {
		id: string;
		user: {
			name: string;
		};
	};
	task: {
		id: string;
		name: string;
		description: string | null;
		isTeamTask: boolean;
		criteria: Array<{
			id: string;
			name: string;
			description: string | null;
			type: CriteriaType;
			weight: number | null;
			criteriaGroup: {
				title: string;
				factorType: "POTENTIAL" | "COMPETENCE";
			};
		}>;
	};
	quantitativeRatings: Array<{
		criteriaId: string;
		value: number;
		notes: string | null;
	}>;
	qualitativeRatings: Array<{
		criteriaId: string;
		text: string;
	}>;
};

export type EvaluationParticipantDetailData = {
	participant: {
		id: string;
		name: string;
		groupName: string | null;
		overallScore: number | null;
		completedTaskCount: number;
		totalTaskCount: number;
		completedAssignmentCount: number;
		totalAssignmentCount: number;
		qualitativeEntries: number;
		teamObservationCount: number;
	};
	tasks: Array<{
		id: string;
		name: string;
		description: string | null;
		isTeamTask: boolean;
		score: number | null;
		completedAssignments: number;
		totalAssignments: number;
		criteria: Array<
			| {
					id: string;
					name: string;
					description: string | null;
					criteriaGroupTitle: string;
					criteriaGroupFactorType: "POTENTIAL" | "COMPETENCE";
					type: "QUANTITATIVE";
					weight: number;
					averageScore: number | null;
					ratings: Array<{
						reviewerName: string;
						value: number;
						notes: string | null;
					}>;
			  }
			| {
					id: string;
					name: string;
					description: string | null;
					criteriaGroupTitle: string;
					criteriaGroupFactorType: "POTENTIAL" | "COMPETENCE";
					type: "QUALITATIVE";
					textEntries: Array<{
						reviewerName: string;
						text: string;
					}>;
			  }
		>;
		teamObservations: Array<{
			reviewerName: string;
			notes: string;
		}>;
	}>;
};

async function fetchParticipantDetailSource(
	acId: string,
	participantId: string,
) {
	return db.participant.findFirst({
		where: {
			id: participantId,
			assessmentCenterId: acId,
			deletedAt: null,
		},
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
			reviewerAssignments: {
				where: {
					reviewer: {
						assessmentCenterId: acId,
					},
				},
				select: {
					id: true,
					reviewer: {
						select: {
							id: true,
							user: {
								select: {
									name: true,
								},
							},
						},
					},
					task: {
						select: {
							id: true,
							name: true,
							description: true,
							isTeamTask: true,
							criteria: {
								where: { deletedAt: null },
								select: {
									id: true,
									name: true,
									description: true,
									type: true,
									weight: true,
									criteriaGroup: {
										select: {
											title: true,
											factorType: true,
										},
									},
								},
								orderBy: { createdAt: "asc" },
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
				orderBy: [{ task: { createdAt: "asc" } }, { createdAt: "asc" }],
			},
		},
	});
}

async function fetchTeamObservations(acId: string, groupId: string) {
	return db.teamTaskObservation.findMany({
		where: {
			groupId,
			deletedAt: null,
			task: {
				assessmentCenterId: acId,
				deletedAt: null,
			},
		},
		select: {
			taskId: true,
			notes: true,
			reviewer: {
				select: {
					user: {
						select: {
							name: true,
						},
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});
}

function buildTaskScore(
	assignments: DetailAssignment[],
	criteria: DetailAssignment["task"]["criteria"],
) {
	let weightedValueSum = 0;
	let weightSum = 0;

	for (const criterion of criteria) {
		if (criterion.type !== "QUANTITATIVE" || criterion.weight === null) {
			continue;
		}

		const values = assignments.flatMap((assignment) =>
			assignment.quantitativeRatings
				.filter((rating) => rating.criteriaId === criterion.id)
				.map((rating) => rating.value),
		);

		if (values.length === 0) {
			continue;
		}

		const averageValue =
			values.reduce((sum, value) => sum + value, 0) / values.length;
		weightedValueSum += averageValue * criterion.weight;
		weightSum += criterion.weight;
	}

	return weightSum === 0 ? null : roundScore(weightedValueSum / weightSum);
}

export async function getEvaluationParticipantDetailData(
	acId: string,
	participantId: string,
): Promise<EvaluationParticipantDetailData> {
	const participant = await fetchParticipantDetailSource(acId, participantId);

	if (!participant) {
		notFound();
	}

	const group = participant.groupMemberships[0]?.group ?? null;
	const teamObservations = group
		? await fetchTeamObservations(acId, group.id)
		: [];
	const assignmentsByTask = new Map<string, DetailAssignment[]>();

	for (const assignment of participant.reviewerAssignments) {
		const taskAssignments = assignmentsByTask.get(assignment.task.id) ?? [];
		taskAssignments.push(assignment);
		assignmentsByTask.set(assignment.task.id, taskAssignments);
	}

	let completedTaskCount = 0;
	let completedAssignmentCount = 0;
	let totalAssignmentCount = 0;
	let qualitativeEntries = 0;
	let teamObservationCount = 0;
	let overallWeightedSum = 0;
	let overallWeightSum = 0;

	const tasks = Array.from(assignmentsByTask.values())
		.map((taskAssignments) => {
			const firstAssignment = taskAssignments[0];
			if (!firstAssignment) {
				return null;
			}

			const task = firstAssignment.task;
			const score = buildTaskScore(taskAssignments, task.criteria);
			const completedAssignments = taskAssignments.filter((assignment) =>
				isAssignmentComplete(assignment, task.criteria.length),
			).length;
			const taskQualitativeEntries = taskAssignments.reduce(
				(sum, assignment) => sum + assignment.qualitativeRatings.length,
				0,
			);
			const taskTeamObservations = teamObservations
				.filter(
					(observation) =>
						observation.taskId === task.id && observation.notes !== null,
				)
				.map((observation) => ({
					reviewerName: observation.reviewer.user.name,
					notes: observation.notes ?? "",
				}));

			totalAssignmentCount += taskAssignments.length;
			completedAssignmentCount += completedAssignments;
			qualitativeEntries += taskQualitativeEntries;
			teamObservationCount += taskTeamObservations.length;

			if (completedAssignments === taskAssignments.length) {
				completedTaskCount += 1;
			}

			const quantitativeWeight = task.criteria.reduce((sum, criterion) => {
				if (criterion.type !== "QUANTITATIVE" || criterion.weight === null) {
					return sum;
				}

				return sum + criterion.weight;
			}, 0);

			if (score !== null && quantitativeWeight > 0) {
				overallWeightedSum += score * quantitativeWeight;
				overallWeightSum += quantitativeWeight;
			}

			return {
				id: task.id,
				name: task.name,
				description: task.description,
				isTeamTask: task.isTeamTask,
				score,
				completedAssignments,
				totalAssignments: taskAssignments.length,
				criteria: task.criteria.map((criterion) => {
					if (criterion.type === "QUANTITATIVE" && criterion.weight !== null) {
						const ratings = taskAssignments
							.map((assignment) => {
								const rating = assignment.quantitativeRatings.find(
									(entry) => entry.criteriaId === criterion.id,
								);
								if (!rating) {
									return null;
								}

								return {
									reviewerName: assignment.reviewer.user.name,
									value: rating.value,
									notes: rating.notes,
								};
							})
							.filter((rating) => rating !== null);

						return {
							id: criterion.id,
							name: criterion.name,
							description: criterion.description,
							criteriaGroupTitle: criterion.criteriaGroup.title,
							criteriaGroupFactorType: criterion.criteriaGroup.factorType,
							type: "QUANTITATIVE" as const,
							weight: criterion.weight,
							averageScore:
								ratings.length === 0
									? null
									: roundScore(
											ratings.reduce((sum, rating) => sum + rating.value, 0) /
												ratings.length,
										),
							ratings,
						};
					}

					const textEntries = taskAssignments
						.map((assignment) => {
							const rating = assignment.qualitativeRatings.find(
								(entry) => entry.criteriaId === criterion.id,
							);
							if (!rating) {
								return null;
							}

							return {
								reviewerName: assignment.reviewer.user.name,
								text: rating.text,
							};
						})
						.filter((entry) => entry !== null);

					return {
						id: criterion.id,
						name: criterion.name,
						description: criterion.description,
						criteriaGroupTitle: criterion.criteriaGroup.title,
						criteriaGroupFactorType: criterion.criteriaGroup.factorType,
						type: "QUALITATIVE" as const,
						textEntries,
					};
				}),
				teamObservations: taskTeamObservations,
			};
		})
		.filter((task) => task !== null)
		.sort((left, right) => left.name.localeCompare(right.name, "de-DE"));

	return {
		participant: {
			id: participant.id,
			name: participant.name,
			groupName: group?.name ?? null,
			overallScore:
				overallWeightSum === 0
					? null
					: roundScore(overallWeightedSum / overallWeightSum),
			completedTaskCount,
			totalTaskCount: tasks.length,
			completedAssignmentCount,
			totalAssignmentCount,
			qualitativeEntries,
			teamObservationCount,
		},
		tasks,
	};
}
