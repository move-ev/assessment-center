import "server-only";

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import {
	getParticipantReviewerBreakdown,
	type ReviewerBreakdownData,
} from "./get-participant-reviewer-breakdown";
import {
	buildParticipantDashboardSnapshot,
	parseParticipantDashboardSnapshot,
} from "./participant-dashboard-snapshot";
import { roundScore } from "./shared";

type FactorFilter = "ALL" | "COMPETENCE" | "POTENTIAL";

type ParticipantDashboardGroup = NonNullable<
	ReturnType<typeof parseParticipantDashboardSnapshot>
>["participants"][number]["groups"][number];

export type EvaluationParticipantDetailData = {
	participant: {
		id: string;
		name: string;
		groupName: string | null;
		overallScore: number | null;
		completedAssignmentCount: number;
		totalAssignmentCount: number;
		scoredGroupCount: number;
		totalGroupCount: number;
	};
	views: Array<{
		filter: FactorFilter;
		label: string;
		participantAverage: number | null;
		benchmarkAverage: number | null;
		deltaAverage: number | null;
		groupCount: number;
		scoredGroupCount: number;
		groups: Array<{
			axisId: string;
			taskId: string;
			taskName: string;
			criteriaGroupId: string;
			criteriaGroupTitle: string;
			factorType: "COMPETENCE" | "POTENTIAL";
			criteriaCount: number;
			participantScore: number | null;
			benchmarkScore: number | null;
			delta: number | null;
		}>;
	}>;
	reviewerBreakdown: ReviewerBreakdownData;
};

const VIEW_DEFINITIONS: Array<{
	filter: FactorFilter;
	label: string;
}> = [
	{ filter: "ALL", label: "Gesamt" },
	{ filter: "COMPETENCE", label: "Kompetenz" },
	{ filter: "POTENTIAL", label: "Potenzial" },
];

function getFilteredGroups(
	groups: ParticipantDashboardGroup[],
	filter: FactorFilter,
) {
	if (filter === "ALL") {
		return groups;
	}

	return groups.filter((group) => group.factorType === filter);
}

function buildWeightedAverage(
	groups: Array<{
		participantScore: number | null;
		benchmarkScore: number | null;
		weightTotal: number;
	}>,
	key: "participantScore" | "benchmarkScore",
) {
	let weightedValueSum = 0;
	let weightSum = 0;

	for (const group of groups) {
		const score = group[key];
		if (score === null || group.weightTotal <= 0) {
			continue;
		}

		weightedValueSum += score * group.weightTotal;
		weightSum += group.weightTotal;
	}

	return weightSum === 0 ? null : roundScore(weightedValueSum / weightSum);
}

function buildViews(
	groups: ParticipantDashboardGroup[],
): EvaluationParticipantDetailData["views"] {
	return VIEW_DEFINITIONS.map((definition) => {
		const filteredGroups = getFilteredGroups(groups, definition.filter).map(
			(group) => ({
				axisId: group.axisId,
				taskId: group.taskId,
				taskName: group.taskName,
				criteriaGroupId: group.criteriaGroupId,
				criteriaGroupTitle: group.criteriaGroupTitle,
				factorType: group.factorType,
				criteriaCount: group.criteriaCount,
				participantScore: group.participantScore,
				benchmarkScore: group.benchmarkScore,
				delta:
					group.participantScore === null || group.benchmarkScore === null
						? null
						: roundScore(group.participantScore - group.benchmarkScore),
				weightTotal: group.weightTotal,
			}),
		);
		const participantAverage = buildWeightedAverage(
			filteredGroups,
			"participantScore",
		);
		const benchmarkAverage = buildWeightedAverage(
			filteredGroups,
			"benchmarkScore",
		);

		return {
			filter: definition.filter,
			label: definition.label,
			participantAverage,
			benchmarkAverage,
			deltaAverage:
				participantAverage === null || benchmarkAverage === null
					? null
					: roundScore(participantAverage - benchmarkAverage),
			groupCount: filteredGroups.length,
			scoredGroupCount: filteredGroups.filter(
				(group) => group.participantScore !== null,
			).length,
			groups: filteredGroups.map(
				({ weightTotal: _weightTotal, ...group }) => group,
			),
		};
	});
}

async function fetchParticipantSnapshot(acId: string, participantId: string) {
	const assessmentCenter = await db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: {
			id: true,
			participantDashboardSnapshot: true,
		},
	});

	if (!assessmentCenter) {
		notFound();
	}

	const snapshot =
		parseParticipantDashboardSnapshot(
			assessmentCenter.participantDashboardSnapshot,
		) ?? (await buildParticipantDashboardSnapshot(acId));

	return snapshot.participants.find(
		(participant) => participant.id === participantId,
	);
}

export async function getEvaluationParticipantDetailData(
	acId: string,
	participantId: string,
): Promise<EvaluationParticipantDetailData> {
	const [participant, reviewerBreakdown] = await Promise.all([
		fetchParticipantSnapshot(acId, participantId),
		getParticipantReviewerBreakdown(acId, participantId),
	]);

	if (!participant) {
		notFound();
	}

	return {
		participant: {
			id: participant.id,
			name: participant.name,
			groupName: participant.groupName,
			overallScore: participant.overallScore,
			completedAssignmentCount: participant.completedAssignmentCount,
			totalAssignmentCount: participant.totalAssignmentCount,
			scoredGroupCount: participant.scoredGroupCount,
			totalGroupCount: participant.totalGroupCount,
		},
		views: buildViews(participant.groups),
		reviewerBreakdown,
	};
}
