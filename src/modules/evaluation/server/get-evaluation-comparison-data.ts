import "server-only";

import {
	type ComparisonIds,
	compareParticipants,
	type ParticipantComparison,
	parseComparisonIds,
} from "./compare";
import {
	type EvaluationResultsData,
	getEvaluationResultsData,
} from "./get-evaluation-results-data";

type ResultsParticipant = EvaluationResultsData["participants"][number];

export type ComparedParticipant = Pick<
	ResultsParticipant,
	| "id"
	| "name"
	| "groupName"
	| "overallScore"
	| "rank"
	| "rankingBand"
	| "showsDecimal"
	| "deviatingTaskNames"
> & {
	/** Task score per task id; null without a score. */
	taskScores: Record<string, number | null>;
};

export type EvaluationComparisonData = {
	/** Everyone in the ranking, to swap or add people on the page. */
	candidates: Array<{ id: string; name: string; rank: number | null }>;
	/** Participants with an overall score, for "Rang X von N". */
	rankedCount: number;
	tasks: Array<{
		id: string;
		name: string;
		averageScore: number | null;
		minScore: number | null;
		maxScore: number | null;
	}>;
	selection:
		| {
				ok: true;
				people: ComparedParticipant[];
				comparison: ParticipantComparison;
		  }
		| Extract<ComparisonIds, { ok: false }>;
};

function toComparedParticipant(
	participant: ResultsParticipant,
): ComparedParticipant {
	return {
		id: participant.id,
		name: participant.name,
		groupName: participant.groupName,
		overallScore: participant.overallScore,
		rank: participant.rank,
		rankingBand: participant.rankingBand,
		showsDecimal: participant.showsDecimal,
		deviatingTaskNames: participant.deviatingTaskNames,
		taskScores: Object.fromEntries(
			participant.taskResults.map((task) => [task.taskId, task.score]),
		),
	};
}

/**
 * The comparison page reads the same results as the ranking, so rank,
 * overall and task scores match it exactly.
 */
export async function getEvaluationComparisonData(
	acId: string,
	rawIds: string | undefined,
): Promise<EvaluationComparisonData> {
	const results = await getEvaluationResultsData(acId);
	const byId = new Map(
		results.participants.map((participant) => [participant.id, participant]),
	);
	const parsed = parseComparisonIds(rawIds, [...byId.keys()]);
	const tasks = results.tasks.map((task) => ({
		id: task.id,
		name: task.name,
		averageScore: task.averageScore,
		minScore: task.minScore,
		maxScore: task.maxScore,
	}));

	const base = {
		candidates: results.participants.map(({ id, name, rank }) => ({
			id,
			name,
			rank,
		})),
		rankedCount: results.summary.participantsWithScore,
		tasks,
	};

	if (!parsed.ok) {
		return { ...base, selection: parsed };
	}

	const people = parsed.ids.map((id) => {
		const participant = byId.get(id);
		// parseComparisonIds only lets through ids of this ranking.
		if (!participant) {
			throw new Error(`Participant ${id} missing from the results`);
		}
		return toComparedParticipant(participant);
	});

	return {
		...base,
		selection: {
			ok: true,
			people,
			comparison: compareParticipants(
				people,
				tasks.map((task) => task.id),
			),
		},
	};
}
