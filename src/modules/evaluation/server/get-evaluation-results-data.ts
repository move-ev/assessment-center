import "server-only";

import { notFound } from "next/navigation";
import { formatPercentForExport } from "@/lib/format-percent";
import { assertRatingScaleMax, type RatingScaleMax } from "@/lib/rating-scale";
import { getAssignmentCompletion } from "@/lib/review-completion";
import { db } from "@/server/db";
import { getRankingBand, type RankingBand } from "./ranking";
import {
	computeTaskPercent,
	computeWeightedMean,
	getScoredCriteria,
	roundScore,
	type WeightedScore,
} from "./scoring";

type QuantitativeRatingRecord = {
	criteriaId: string;
	value: number;
};

type QualitativeRatingRecord = {
	criteriaId: string;
};

type AssignmentRecord = {
	participantId: string;
	taskId: string;
	quantitativeRatings: QuantitativeRatingRecord[];
	qualitativeRatings: QualitativeRatingRecord[];
};

type TaskDefinition = {
	id: string;
	name: string;
	isTeamTask: boolean;
	scoreWeight: number;
	criteria: Array<{
		id: string;
		name: string;
		type: "QUANTITATIVE" | "QUALITATIVE";
		weight: number | null;
		isOptional: boolean;
		criteriaGroup: { title: string };
	}>;
	teamObservations: Array<{
		groupId: string;
		reviewerId: string;
		notes: string | null;
		reviewer: {
			user: { name: string };
		};
	}>;
};

type QueryResult = NonNullable<
	Awaited<ReturnType<typeof fetchEvaluationResultsSourceData>>
>;

type ParticipantTaskResult = {
	taskId: string;
	taskName: string;
	isTeamTask: boolean;
	/** Weight of the task in the overall score. */
	scoreWeight: number;
	score: number | null;
	totalAssignments: number;
	completedAssignments: number;
	qualitativeEntries: number;
	teamObservationCount: number;
};

type ParticipantResult = {
	id: string;
	name: string;
	groupId: string | null;
	groupName: string | null;
	overallScore: number | null;
	completedTaskCount: number;
	totalTaskCount: number;
	completedAssignmentCount: number;
	totalAssignmentCount: number;
	qualitativeEntries: number;
	teamObservationCount: number;
	taskResults: ParticipantTaskResult[];
	/** Top or bottom 15 % of the ranking, null otherwise or without a score. */
	rankingBand: RankingBand | null;
};

type UnrankedParticipantResult = Omit<ParticipantResult, "rankingBand">;

type TaskResult = {
	id: string;
	name: string;
	isTeamTask: boolean;
	participantCount: number;
	reviewerAssignmentCount: number;
	completedAssignmentCount: number;
	averageScore: number | null;
	qualitativeEntryCount: number;
	teamObservationCount: number;
};

export type EvaluationCriterionResult = {
	id: string;
	taskId: string;
	taskName: string;
	criteriaGroupTitle: string;
	name: string;
	type: "QUANTITATIVE" | "QUALITATIVE";
	weight: number | null;
	averageScore: number | null;
	ratingCount: number;
	textEntryCount: number;
};

export type EvaluationResultsData = {
	/** Highest star of the AC's scale; criterion averages are in stars. */
	ratingScaleMax: RatingScaleMax;
	summary: {
		participantCount: number;
		taskCount: number;
		reviewerCount: number;
		totalAssignments: number;
		completedAssignments: number;
		completionPercent: number;
		averageOverallScore: number | null;
		participantsWithScore: number;
		qualitativeEntries: number;
		teamObservationCount: number;
	};
	participants: ParticipantResult[];
	tasks: TaskResult[];
	criteria: EvaluationCriterionResult[];
	exportRows: Array<Record<string, string>>;
};

async function fetchEvaluationResultsSourceData(acId: string) {
	return db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: {
			id: true,
			ratingScaleMax: true,
			reviewers: {
				select: { id: true },
			},
			tasks: {
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					isTeamTask: true,
					scoreWeight: true,
					criteria: {
						where: { deletedAt: null },
						select: {
							id: true,
							name: true,
							type: true,
							weight: true,
							isOptional: true,
							criteriaGroup: { select: { title: true } },
						},
						orderBy: { createdAt: "asc" },
					},
					teamObservations: {
						where: { deletedAt: null },
						select: {
							groupId: true,
							reviewerId: true,
							notes: true,
							reviewer: {
								select: {
									user: { select: { name: true } },
								},
							},
						},
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
							participantId: true,
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
								select: { criteriaId: true },
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

function buildTaskLookup(data: QueryResult) {
	return new Map(data.tasks.map((task) => [task.id, task]));
}

function buildCriterionResults(data: QueryResult) {
	const results: EvaluationCriterionResult[] = [];

	for (const task of data.tasks) {
		for (const criteria of task.criteria) {
			const quantitativeValues: number[] = [];
			let textEntryCount = 0;

			for (const participant of data.participants) {
				for (const assignment of participant.reviewerAssignments) {
					if (assignment.taskId !== task.id) {
						continue;
					}

					if (criteria.type === "QUANTITATIVE") {
						for (const rating of assignment.quantitativeRatings) {
							if (rating.criteriaId === criteria.id) {
								quantitativeValues.push(rating.value);
							}
						}
						continue;
					}

					for (const rating of assignment.qualitativeRatings) {
						if (rating.criteriaId === criteria.id) {
							textEntryCount += 1;
						}
					}
				}
			}

			results.push({
				id: criteria.id,
				taskId: task.id,
				taskName: task.name,
				criteriaGroupTitle: criteria.criteriaGroup.title,
				name: criteria.name,
				type: criteria.type,
				weight: criteria.weight,
				averageScore:
					quantitativeValues.length === 0
						? null
						: roundScore(
								quantitativeValues.reduce((sum, value) => sum + value, 0) /
									quantitativeValues.length,
							),
				ratingCount: quantitativeValues.length,
				textEntryCount,
			});
		}
	}

	return results.sort((left, right) => {
		const taskComparison = left.taskName.localeCompare(right.taskName, "de-DE");
		if (taskComparison !== 0) {
			return taskComparison;
		}

		return left.name.localeCompare(right.name, "de-DE");
	});
}

type ParticipantTaskContext = {
	groupId: string | null;
	ratingScaleMax: RatingScaleMax;
};

function buildParticipantTaskResult(
	assignments: AssignmentRecord[],
	taskDefinition: TaskDefinition,
	{ groupId, ratingScaleMax }: ParticipantTaskContext,
) {
	if (assignments.length === 0) {
		return null;
	}

	let completedAssignments = 0;
	let qualitativeEntries = 0;

	for (const assignment of assignments) {
		if (
			getAssignmentCompletion(taskDefinition.criteria, assignment).isComplete
		) {
			completedAssignments += 1;
		}

		qualitativeEntries += assignment.qualitativeRatings.length;
	}

	const teamObservationCount = groupId
		? taskDefinition.teamObservations.filter(
				(observation) => observation.groupId === groupId,
			).length
		: 0;

	return {
		taskId: taskDefinition.id,
		taskName: taskDefinition.name,
		isTeamTask: taskDefinition.isTeamTask,
		scoreWeight: taskDefinition.scoreWeight,
		score: computeTaskPercent(
			getScoredCriteria(taskDefinition.criteria),
			assignments.map((assignment) => assignment.quantitativeRatings),
			ratingScaleMax,
		),
		totalAssignments: assignments.length,
		completedAssignments,
		qualitativeEntries,
		teamObservationCount,
	} satisfies ParticipantTaskResult;
}

function sortParticipantTaskResults(results: ParticipantTaskResult[]) {
	return results.sort((left, right) => {
		if (left.score === null && right.score !== null) {
			return 1;
		}

		if (left.score !== null && right.score === null) {
			return -1;
		}

		return left.taskName.localeCompare(right.taskName, "de-DE");
	});
}

function buildParticipantResults(
	data: QueryResult,
	taskLookup: ReturnType<typeof buildTaskLookup>,
	ratingScaleMax: RatingScaleMax,
) {
	const participants: UnrankedParticipantResult[] = [];

	for (const participant of data.participants) {
		const group = participant.groupMemberships[0]?.group ?? null;
		const assignmentsByTask = new Map<string, AssignmentRecord[]>();

		for (const assignment of participant.reviewerAssignments) {
			const taskAssignments = assignmentsByTask.get(assignment.taskId) ?? [];
			taskAssignments.push(assignment);
			assignmentsByTask.set(assignment.taskId, taskAssignments);
		}

		const taskResults = Array.from(assignmentsByTask.entries())
			.map(([taskId, assignments]) => {
				const taskDefinition = taskLookup.get(taskId);
				if (!taskDefinition) {
					return null;
				}

				return buildParticipantTaskResult(assignments, taskDefinition, {
					groupId: group?.id ?? null,
					ratingScaleMax,
				});
			})
			.filter((result) => result !== null);

		const sortedTaskResults = sortParticipantTaskResults(taskResults);
		const weightedTaskScores: WeightedScore[] = [];
		let completedTaskCount = 0;
		let completedAssignmentCount = 0;
		let totalAssignmentCount = 0;
		let qualitativeEntries = 0;
		let teamObservationCount = 0;

		for (const taskResult of sortedTaskResults) {
			completedAssignmentCount += taskResult.completedAssignments;
			totalAssignmentCount += taskResult.totalAssignments;
			qualitativeEntries += taskResult.qualitativeEntries;
			teamObservationCount += taskResult.teamObservationCount;

			if (taskResult.completedAssignments === taskResult.totalAssignments) {
				completedTaskCount += 1;
			}

			weightedTaskScores.push({
				score: taskResult.score,
				weight: taskResult.scoreWeight,
			});
		}

		participants.push({
			id: participant.id,
			name: participant.name,
			groupId: group?.id ?? null,
			groupName: group?.name ?? null,
			overallScore: computeWeightedMean(weightedTaskScores),
			completedTaskCount,
			totalTaskCount: sortedTaskResults.length,
			completedAssignmentCount,
			totalAssignmentCount,
			qualitativeEntries,
			teamObservationCount,
			taskResults: sortedTaskResults,
		});
	}

	return rankParticipants(participants);
}

function sortByOverallScore<
	T extends { name: string; overallScore: number | null },
>(participants: T[]): T[] {
	return participants.sort((left, right) => {
		if (left.overallScore === null && right.overallScore !== null) {
			return 1;
		}

		if (left.overallScore !== null && right.overallScore === null) {
			return -1;
		}

		if (left.overallScore !== null && right.overallScore !== null) {
			return right.overallScore - left.overallScore;
		}

		return left.name.localeCompare(right.name, "de-DE");
	});
}

/**
 * Sorts by overall score (those without a score last) and marks the top and
 * bottom of the ranking. Both happen here because the marking depends on the
 * sort order.
 */
function rankParticipants(
	participants: UnrankedParticipantResult[],
): ParticipantResult[] {
	const sorted = sortByOverallScore(participants);
	const rankedCount = sorted.filter(
		(participant) => participant.overallScore !== null,
	).length;

	return sorted.map((participant, index) => ({
		...participant,
		rankingBand:
			participant.overallScore === null
				? null
				: getRankingBand(index + 1, rankedCount),
	}));
}

function buildTaskResults(
	data: QueryResult,
	participants: ParticipantResult[],
) {
	return data.tasks
		.map((task) => {
			let reviewerAssignmentCount = 0;
			let completedAssignmentCount = 0;
			let qualitativeEntryCount = 0;
			const participantScores: number[] = [];
			let participantCount = 0;

			for (const participant of data.participants) {
				const assignments = participant.reviewerAssignments.filter(
					(assignment) => assignment.taskId === task.id,
				);

				if (assignments.length === 0) {
					continue;
				}

				participantCount += 1;
				reviewerAssignmentCount += assignments.length;
				qualitativeEntryCount += assignments.reduce(
					(sum, assignment) => sum + assignment.qualitativeRatings.length,
					0,
				);

				for (const assignment of assignments) {
					if (getAssignmentCompletion(task.criteria, assignment).isComplete) {
						completedAssignmentCount += 1;
					}
				}

				const participantTask = participants
					.find((entry) => entry.id === participant.id)
					?.taskResults.find((entry) => entry.taskId === task.id);

				if (
					participantTask?.score !== null &&
					participantTask?.score !== undefined
				) {
					participantScores.push(participantTask.score);
				}
			}

			return {
				id: task.id,
				name: task.name,
				isTeamTask: task.isTeamTask,
				participantCount,
				reviewerAssignmentCount,
				completedAssignmentCount,
				averageScore:
					participantScores.length === 0
						? null
						: roundScore(
								participantScores.reduce((sum, value) => sum + value, 0) /
									participantScores.length,
							),
				qualitativeEntryCount,
				teamObservationCount: task.teamObservations.length,
			} satisfies TaskResult;
		})
		.sort((left, right) => left.name.localeCompare(right.name, "de-DE"));
}

function buildExportRows(
	participants: ParticipantResult[],
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	return participants.map((participant, index) => {
		const row: Record<string, string> = {
			Rang: (index + 1).toString(),
			Teilnehmer: participant.name,
			Gruppe: participant.groupName ?? "Keine Gruppe",
			Gesamtwert_Prozent: formatPercentForExport(participant.overallScore),
			Abgeschlossene_Aufgaben: `${participant.completedTaskCount}/${participant.totalTaskCount}`,
			Abgeschlossene_Bewertungen: `${participant.completedAssignmentCount}/${participant.totalAssignmentCount}`,
			Qualitative_Eintraege: participant.qualitativeEntries.toString(),
			Teambeobachtungen: participant.teamObservationCount.toString(),
		};

		for (const task of taskLookup.values()) {
			const taskResult = participant.taskResults.find(
				(entry) => entry.taskId === task.id,
			);
			row[`Aufgabe_${task.name}_Prozent`] = formatPercentForExport(
				taskResult?.score ?? null,
			);
		}

		for (const task of taskLookup.values()) {
			row[`Teambeobachtung_${task.name}`] = formatTeamObservations(
				task,
				participant.groupId,
			);
		}

		return row;
	});
}

function formatTeamObservations(
	task: TaskDefinition,
	groupId: string | null,
): string {
	if (!task.isTeamTask || !groupId) {
		return "";
	}

	const notes = task.teamObservations
		.filter(
			(observation) =>
				observation.groupId === groupId &&
				observation.notes !== null &&
				observation.notes.trim() !== "",
		)
		.map(
			(observation) =>
				`${observation.reviewer.user.name}: ${(observation.notes ?? "").trim()}`,
		);

	return notes.join(" | ");
}

function buildSummary(data: QueryResult, participants: ParticipantResult[]) {
	let totalAssignments = 0;
	let completedAssignments = 0;
	let qualitativeEntries = 0;
	let teamObservationCount = 0;
	const scoredParticipants = participants.filter(
		(participant) => participant.overallScore !== null,
	);

	for (const participant of data.participants) {
		for (const assignment of participant.reviewerAssignments) {
			totalAssignments += 1;
			qualitativeEntries += assignment.qualitativeRatings.length;
		}
	}

	for (const participant of participants) {
		completedAssignments += participant.completedAssignmentCount;
		teamObservationCount += participant.teamObservationCount;
	}

	return {
		participantCount: data.participants.length,
		taskCount: data.tasks.length,
		reviewerCount: data.reviewers.length,
		totalAssignments,
		completedAssignments,
		completionPercent:
			totalAssignments === 0
				? 0
				: Math.round((completedAssignments / totalAssignments) * 100),
		averageOverallScore:
			scoredParticipants.length === 0
				? null
				: roundScore(
						scoredParticipants.reduce(
							(sum, participant) => sum + (participant.overallScore ?? 0),
							0,
						) / scoredParticipants.length,
					),
		participantsWithScore: scoredParticipants.length,
		qualitativeEntries,
		teamObservationCount,
	};
}

export async function getEvaluationResultsData(
	acId: string,
): Promise<EvaluationResultsData> {
	const data = await fetchEvaluationResultsSourceData(acId);

	if (!data) {
		notFound();
	}

	const ratingScaleMax = assertRatingScaleMax(data.ratingScaleMax);
	const taskLookup = buildTaskLookup(data);
	const participants = buildParticipantResults(
		data,
		taskLookup,
		ratingScaleMax,
	);

	return {
		ratingScaleMax,
		summary: buildSummary(data, participants),
		participants,
		tasks: buildTaskResults(data, participants),
		criteria: buildCriterionResults(data),
		exportRows: buildExportRows(participants, taskLookup),
	};
}
