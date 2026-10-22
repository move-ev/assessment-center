import { roundScore } from "./scoring.ts";

export type ComparedPerson = {
	id: string;
	overallScore: number | null;
	/** Task score per task id; null or missing without a score. */
	taskScores: Record<string, number | null>;
};

export type TaskLead = {
	/** Everyone with the best score in this task; several on a tie. */
	leaderIds: string[];
};

export type PersonSummary = {
	/** Tasks this person is ahead in, ties included. */
	leadCount: number;
	/** Points behind the best overall score; null without an overall score. */
	gapToBest: number | null;
};

function findLeaders(people: ComparedPerson[], taskId: string): string[] {
	const scored = people.flatMap((person) => {
		const score = person.taskScores[taskId];
		return score === null || score === undefined
			? []
			: [{ id: person.id, score }];
	});
	// One score alone has nothing to be ahead of.
	if (scored.length < 2) {
		return [];
	}

	const best = Math.max(...scored.map((entry) => entry.score));

	return scored
		.filter((entry) => entry.score === best)
		.map((entry) => entry.id);
}

/**
 * Compares 2–3 participants side by side: who is ahead in each task and
 * overall, for the comparison page. Returns the given people and tasks,
 * each with what the comparison says about them.
 */
export function compareParticipants<
	P extends ComparedPerson,
	T extends { id: string },
>(
	people: P[],
	tasks: T[],
): { people: Array<P & PersonSummary>; tasks: Array<T & TaskLead> } {
	const ledTasks = tasks.map((task) => ({
		...task,
		leaderIds: findLeaders(people, task.id),
	}));
	const overallScores = people.flatMap((person) =>
		person.overallScore === null ? [] : [person.overallScore],
	);
	const bestOverall =
		overallScores.length === 0 ? null : Math.max(...overallScores);

	return {
		tasks: ledTasks,
		people: people.map((person) => ({
			...person,
			leadCount: ledTasks.filter((task) => task.leaderIds.includes(person.id))
				.length,
			gapToBest:
				person.overallScore === null || bestOverall === null
					? null
					: roundScore(bestOverall - person.overallScore),
		})),
	};
}

/** People shown side by side on the comparison page. */
export const MIN_COMPARED = 2;
export const MAX_COMPARED = 3;

export type ComparisonIdsError = "TOO_FEW" | "TOO_MANY" | "UNKNOWN";

export type ComparisonIds =
	| { ok: true; ids: string[] }
	| { ok: false; reason: ComparisonIdsError };

/**
 * The participants to compare from the URL (`?ids=a,b,c`, also repeated):
 * 2–3 distinct participants of the AC, in the order given.
 */
export function parseComparisonIds(
	raw: string | string[] | undefined,
	knownIds: string[],
): ComparisonIds {
	const ids = [
		...new Set(
			[raw ?? []]
				.flat()
				.flatMap((value) => value.split(","))
				.map((id) => id.trim())
				.filter((id) => id !== ""),
		),
	];

	if (ids.length < MIN_COMPARED) {
		return { ok: false, reason: "TOO_FEW" };
	}
	if (ids.length > MAX_COMPARED) {
		return { ok: false, reason: "TOO_MANY" };
	}
	if (ids.some((id) => !knownIds.includes(id))) {
		return { ok: false, reason: "UNKNOWN" };
	}
	return { ok: true, ids };
}
