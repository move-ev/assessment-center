import type { AssignedRessort } from "@/lib/ressort-assignment";
import "server-only";

import { notFound } from "next/navigation";
import { formatPercentForExport } from "@/lib/format-percent";
import { assertRatingScaleMax, type RatingScaleMax } from "@/lib/rating-scale";
import { getAssignmentCompletion } from "@/lib/review-completion";
import { db } from "@/server/db";
import {
	type CriterionDisagreement,
	type CriterionStarRating,
	computeCriterionDisagreement,
	computeReviewerLeniency,
	type ReviewerLeniency,
	type ReviewerTaskPercent,
} from "./calibration";
import {
	computeTaskContributions,
	summarizeScores,
	type TaskContribution,
} from "./comparison";
import { computeReviewerSpread, isStrongDeviation } from "./deviation";
import {
	computeHypotheticalOverallScores,
	estimateReviewerEffects,
} from "./hypothetical-scores";
import { type RankFields, rankParticipants } from "./ranking";
import {
	computeMeanPercent,
	computeReviewerPercent,
	computeReviewerPercents,
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
	/** Highest minus lowest reviewer percentage; null with one reviewer. */
	reviewerSpread: number | null;
	/** Reviewers differ by more than the threshold (Sonderfall 1). */
	hasStrongDeviation: boolean;
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
	/** Ressort the person is assigned to (#46); null while unassigned. */
	ressort: AssignedRessort | null;
	overallScore: number | null;
	completedTaskCount: number;
	totalTaskCount: number;
	completedAssignmentCount: number;
	totalAssignmentCount: number;
	qualitativeEntries: number;
	teamObservationCount: number;
	taskResults: ParticipantTaskResult[];
	/** Tasks whose reviewers differ strongly; marks the person in the ranking. */
	deviatingTaskNames: string[];
	/** Sonderfall 1 in any task; ranks behind equal whole percents. */
	hasStrongDeviation: boolean;
	/** Share of each task in the overall score; adds up to it. */
	taskContributions: TaskContribution[];
} & RankFields;

type UnrankedParticipantResult = Omit<ParticipantResult, keyof RankFields>;

type TaskResult = {
	id: string;
	name: string;
	isTeamTask: boolean;
	participantCount: number;
	reviewerAssignmentCount: number;
	completedAssignmentCount: number;
	averageScore: number | null;
	/** Lowest and highest participant score in this task. */
	minScore: number | null;
	maxScore: number | null;
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
	/** Free texts and observations were deleted when the AC was anonymized. */
	isAnonymized: boolean;
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
	calibration: EvaluationCalibration;
	exportRows: Array<Record<string, string>>;
};

export type HypotheticalScore = {
	score: number | null;
	rank: number | null;
};

/**
 * What the overall score and rank would have been with one reviewer for
 * everyone. Context for the real results only: it never replaces them.
 */
export type HypotheticalResults = {
	/** Reviewers with an estimated effect, strictest first. */
	reviewers: Array<{
		reviewerId: string;
		reviewerName: string;
		effect: number;
		comparisonCount: number;
	}>;
	/** Most extreme effects among reviewers with enough comparisons. */
	strictestReviewerId: string | null;
	mildestReviewerId: string | null;
	/** People with a real overall score, in the order of the real ranking. */
	participants: Array<{
		participantId: string;
		name: string;
		actualScore: number;
		actualRank: number | null;
		/** The real ranking shows this score with one decimal. */
		actualShowsDecimal: boolean;
		averageReviewer: HypotheticalScore;
		byReviewer: Record<string, HypotheticalScore>;
		/**
		 * Per task: the average reviewer's score and who really rated. The
		 * real task score minus it is the mean effect of these reviewers.
		 */
		tasks: Array<{
			taskId: string;
			averageReviewerScore: number;
			reviewers: Array<{
				reviewerId: string;
				reviewerName: string;
				effect: number | null;
			}>;
		}>;
	}>;
};

export type EvaluationCalibration = {
	reviewers: Array<ReviewerLeniency & { reviewerName: string }>;
	criteria: Array<
		CriterionDisagreement & {
			taskName: string;
			criteriaGroupTitle: string;
			name: string;
		}
	>;
	hypothetical: HypotheticalResults;
};

async function fetchEvaluationResultsSourceData(acId: string) {
	return db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: {
			id: true,
			ratingScaleMax: true,
			anonymizedAt: true,
			reviewers: {
				select: {
					id: true,
					user: { select: { name: true } },
				},
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
					ressort: { select: { id: true, name: true } },
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
							reviewerId: true,
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

	const scoredCriteria = getScoredCriteria(taskDefinition.criteria);
	const ratingSets = assignments.map(
		(assignment) => assignment.quantitativeRatings,
	);
	const reviewerPercents = computeReviewerPercents(
		scoredCriteria,
		ratingSets,
		ratingScaleMax,
	);
	const reviewerSpread = computeReviewerSpread(reviewerPercents);

	return {
		taskId: taskDefinition.id,
		taskName: taskDefinition.name,
		isTeamTask: taskDefinition.isTeamTask,
		scoreWeight: taskDefinition.scoreWeight,
		score: computeMeanPercent(reviewerPercents),
		reviewerSpread,
		hasStrongDeviation: isStrongDeviation(reviewerSpread),
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
		const deviatingTaskNames = sortedTaskResults
			.filter((taskResult) => taskResult.hasStrongDeviation)
			.map((taskResult) => taskResult.taskName);
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
			ressort: participant.ressort,
			overallScore: computeWeightedMean(weightedTaskScores),
			completedTaskCount,
			totalTaskCount: sortedTaskResults.length,
			completedAssignmentCount,
			totalAssignmentCount,
			qualitativeEntries,
			teamObservationCount,
			taskResults: sortedTaskResults,
			deviatingTaskNames,
			hasStrongDeviation: deviatingTaskNames.length > 0,
			taskContributions: computeTaskContributions(
				sortedTaskResults.map((taskResult) => ({
					taskId: taskResult.taskId,
					score: taskResult.score,
					weight: taskResult.scoreWeight,
				})),
			),
		});
	}

	return rankParticipants(participants);
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

			const scoreSummary = summarizeScores(participantScores);

			return {
				id: task.id,
				name: task.name,
				isTeamTask: task.isTeamTask,
				participantCount,
				reviewerAssignmentCount,
				completedAssignmentCount,
				averageScore: scoreSummary?.mean ?? null,
				minScore: scoreSummary?.min ?? null,
				maxScore: scoreSummary?.max ?? null,
				qualitativeEntryCount,
				teamObservationCount: task.teamObservations.length,
			} satisfies TaskResult;
		})
		.sort((left, right) => left.name.localeCompare(right.name, "de-DE"));
}

/** Map lookup that fails loudly: a miss means the query data is inconsistent. */
function requireEntry<K, V>(map: Map<K, V>, key: K, what: string): V {
	const value = map.get(key);
	if (value === undefined) {
		throw new Error(`Missing ${what} ${String(key)} in evaluation data`);
	}
	return value;
}

/** Fewer shared ratings than this rule a reviewer out as strictest or mildest. */
const MIN_COMPARISONS_FOR_EXTREMES = 3;

/**
 * Overall score and rank of every person under one reviewer effect, ranked
 * like the real ranking (Sonderfall 1 and 2 from the real ratings).
 */
function rankHypothetical(
	participants: ParticipantResult[],
	scores: Map<string, number | null>,
): Map<string, HypotheticalScore> {
	const ranked = rankParticipants(
		participants.map((participant) => ({
			id: participant.id,
			name: participant.name,
			overallScore: scores.get(participant.id) ?? null,
			hasStrongDeviation: participant.hasStrongDeviation,
		})),
	);
	return new Map(
		ranked.map((entry) => [
			entry.id,
			{ score: entry.overallScore, rank: entry.rank },
		]),
	);
}

function buildHypotheticalResults(
	percents: ReviewerTaskPercent[],
	participants: ParticipantResult[],
	taskLookup: ReturnType<typeof buildTaskLookup>,
	reviewerNames: Map<string, string>,
): HypotheticalResults {
	const { reviewers, taskScores } = estimateReviewerEffects(percents);
	const taskWeights = new Map(
		[...taskLookup.values()].map((task) => [task.id, task.scoreWeight]),
	);
	const scored = participants.filter(
		(participant) => participant.overallScore !== null,
	);
	const scenario = (effect: number) =>
		rankHypothetical(
			scored,
			computeHypotheticalOverallScores(taskScores, taskWeights, effect),
		);

	const estimated = reviewers
		.flatMap((reviewer) =>
			reviewer.effect === null
				? []
				: [
						{
							reviewerId: reviewer.reviewerId,
							reviewerName: requireEntry(
								reviewerNames,
								reviewer.reviewerId,
								"reviewer",
							),
							effect: reviewer.effect,
							comparisonCount: reviewer.comparisonCount,
						},
					],
		)
		.sort((left, right) => left.effect - right.effect);
	const candidates = estimated.filter(
		(reviewer) => reviewer.comparisonCount >= MIN_COMPARISONS_FOR_EXTREMES,
	);
	const averageReviewer = scenario(0);
	const byReviewer = new Map(
		estimated.map((reviewer) => [
			reviewer.reviewerId,
			scenario(reviewer.effect),
		]),
	);
	const none: HypotheticalScore = { score: null, rank: null };
	const effects = new Map(
		reviewers.map((reviewer) => [reviewer.reviewerId, reviewer.effect]),
	);
	const panels = new Map<string, ReviewerTaskPercent[]>();
	for (const entry of percents) {
		const key = `${entry.participantId}\u0000${entry.taskId}`;
		panels.set(key, [...(panels.get(key) ?? []), entry]);
	}
	const tasksOf = (participantId: string) =>
		taskScores
			.filter((entry) => entry.participantId === participantId)
			.map((entry) => ({
				taskId: entry.taskId,
				averageReviewerScore: roundScore(entry.score),
				reviewers: (
					panels.get(`${participantId}\u0000${entry.taskId}`) ?? []
				).map((rating) => ({
					reviewerId: rating.reviewerId,
					reviewerName: requireEntry(
						reviewerNames,
						rating.reviewerId,
						"reviewer",
					),
					effect: effects.get(rating.reviewerId) ?? null,
				})),
			}));

	return {
		reviewers: estimated,
		strictestReviewerId: candidates[0]?.reviewerId ?? null,
		mildestReviewerId: candidates.at(-1)?.reviewerId ?? null,
		participants: scored.map((participant) => ({
			participantId: participant.id,
			name: participant.name,
			actualScore: participant.overallScore ?? 0,
			actualRank: participant.rank,
			actualShowsDecimal: participant.showsDecimal,
			averageReviewer: averageReviewer.get(participant.id) ?? none,
			byReviewer: Object.fromEntries(
				[...byReviewer].map(([reviewerId, scores]) => [
					reviewerId,
					scores.get(participant.id) ?? none,
				]),
			),
			tasks: tasksOf(participant.id),
		})),
	};
}

type CriterionMeta = Pick<
	EvaluationCalibration["criteria"][number],
	"taskName" | "criteriaGroupTitle" | "name"
>;

/**
 * Reviewer leniency and criterion disagreement over the whole AC, from each
 * reviewer's own percentage and stars per participant and task. Only scored
 * criteria count, as in the scores themselves.
 */
function buildCalibration(
	data: QueryResult,
	taskLookup: ReturnType<typeof buildTaskLookup>,
	ratingScaleMax: RatingScaleMax,
	participants: ParticipantResult[],
): EvaluationCalibration {
	const percents: ReviewerTaskPercent[] = [];
	const starRatings: CriterionStarRating[] = [];
	const criterionMeta = new Map<string, CriterionMeta>();

	for (const participant of data.participants) {
		for (const assignment of participant.reviewerAssignments) {
			const task = requireEntry(taskLookup, assignment.taskId, "task");
			const scoredCriteria = getScoredCriteria(task.criteria);
			const percent = computeReviewerPercent(
				scoredCriteria,
				assignment.quantitativeRatings,
				ratingScaleMax,
			);
			if (percent !== null) {
				percents.push({
					reviewerId: assignment.reviewerId,
					participantId: participant.id,
					taskId: task.id,
					percent,
				});
			}

			for (const criterion of task.criteria) {
				const rating = assignment.quantitativeRatings.find(
					(entry) => entry.criteriaId === criterion.id,
				);
				if (!rating || !scoredCriteria.some((c) => c.id === criterion.id)) {
					continue;
				}
				starRatings.push({
					criteriaId: criterion.id,
					participantId: participant.id,
					value: rating.value,
				});
				criterionMeta.set(criterion.id, {
					taskName: task.name,
					criteriaGroupTitle: criterion.criteriaGroup.title,
					name: criterion.name,
				});
			}
		}
	}

	const reviewerNames = new Map(
		data.reviewers.map((reviewer) => [reviewer.id, reviewer.user.name]),
	);

	return {
		reviewers: computeReviewerLeniency(percents)
			.map((entry) => ({
				...entry,
				reviewerName: requireEntry(reviewerNames, entry.reviewerId, "reviewer"),
			}))
			.sort((left, right) =>
				left.reviewerName.localeCompare(right.reviewerName, "de-DE"),
			),
		criteria: computeCriterionDisagreement(starRatings).map((entry) => ({
			...entry,
			...requireEntry(criterionMeta, entry.criteriaId, "criterion"),
		})),
		hypothetical: buildHypotheticalResults(
			percents,
			participants,
			taskLookup,
			reviewerNames,
		),
	};
}

function buildExportRows(
	participants: ParticipantResult[],
	taskLookup: ReturnType<typeof buildTaskLookup>,
) {
	return participants.map((participant) => {
		const row: Record<string, string> = {
			Rang: participant.rank?.toString() ?? "",
			Teilnehmer: participant.name,
			Gruppe: participant.groupName ?? "Keine Gruppe",
			Ressort: participant.ressort?.name ?? "",
			Gesamtwert_Prozent: formatPercentForExport(participant.overallScore),
			Abgeschlossene_Aufgaben: `${participant.completedTaskCount}/${participant.totalTaskCount}`,
			Abgeschlossene_Bewertungen: `${participant.completedAssignmentCount}/${participant.totalAssignmentCount}`,
			Qualitative_Eintraege: participant.qualitativeEntries.toString(),
			Teambeobachtungen: participant.teamObservationCount.toString(),
			Starke_Abweichung: participant.deviatingTaskNames.join(", "),
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
		isAnonymized: data.anonymizedAt !== null,
		ratingScaleMax,
		summary: buildSummary(data, participants),
		participants,
		tasks: buildTaskResults(data, participants),
		criteria: buildCriterionResults(data),
		calibration: buildCalibration(
			data,
			taskLookup,
			ratingScaleMax,
			participants,
		),
		exportRows: buildExportRows(participants, taskLookup),
	};
}
