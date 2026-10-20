import { roundScore, type WeightedScore } from "./scoring.ts";

export type ScoreSummary = {
	count: number;
	min: number;
	max: number;
	mean: number;
};

/** Lowest, highest and mean score of a group, e.g. one task across an AC. */
export function summarizeScores(scores: number[]): ScoreSummary | null {
	if (scores.length === 0) {
		return null;
	}

	return {
		count: scores.length,
		min: Math.min(...scores),
		max: Math.max(...scores),
		mean: roundScore(
			scores.reduce((sum, score) => sum + score, 0) / scores.length,
		),
	};
}

/**
 * 1-based position of a score among a group's scores (which include it):
 * one more than the number of higher scores, so ties share a position.
 */
export function getPositionAmong(
	score: number,
	scores: number[],
): { position: number; count: number } {
	return {
		position: 1 + scores.filter((other) => other > score).length,
		count: scores.length,
	};
}

export type TaskContribution = {
	taskId: string;
	/** Percentage points this task adds to the overall score. */
	contribution: number;
};

/**
 * Splits the overall score into the weighted share of each task, so the
 * shares add up to the overall score. Leaves out the same tasks as the
 * overall score: without a score or with a non-positive weight.
 */
export function computeTaskContributions(
	tasks: Array<WeightedScore & { taskId: string }>,
): TaskContribution[] {
	const counted = tasks.flatMap((task) =>
		task.score !== null && task.weight > 0
			? [{ taskId: task.taskId, score: task.score, weight: task.weight }]
			: [],
	);
	const weightSum = counted.reduce((sum, task) => sum + task.weight, 0);

	return counted.map((task) => ({
		taskId: task.taskId,
		contribution: roundScore((task.score * task.weight) / weightSum),
	}));
}

/**
 * Pearson correlation of two tasks' scores over the people who have both:
 * 1 when they rise together, −1 when one falls as the other rises. Null
 * below three people or when one task gave everyone the same score.
 */
export function computeCorrelation(
	points: Array<{ x: number; y: number }>,
): number | null {
	if (points.length < 3) {
		return null;
	}

	const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
	const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
	let covariance = 0;
	let varianceX = 0;
	let varianceY = 0;

	for (const point of points) {
		covariance += (point.x - meanX) * (point.y - meanY);
		varianceX += (point.x - meanX) ** 2;
		varianceY += (point.y - meanY) ** 2;
	}

	return varianceX === 0 || varianceY === 0
		? null
		: roundScore(covariance / Math.sqrt(varianceX * varianceY));
}
