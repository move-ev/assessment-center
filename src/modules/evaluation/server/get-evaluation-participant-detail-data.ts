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
	teamObservations: Array<{
		taskId: string;
		taskName: string;
		entries: Array<{
			reviewerName: string;
			notes: string;
			updatedAt: Date;
		}>;
	}>;
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

async function fetchParticipantGroupId(acId: string, participantId: string) {
	const membership = await db.participantGroupMembership.findFirst({
		where: {
			participantId,
			participant: {
				assessmentCenterId: acId,
				deletedAt: null,
			},
		},
		select: { groupId: true },
		orderBy: { createdAt: "asc" },
	});

	return membership?.groupId ?? null;
}

async function fetchTeamObservations(
	acId: string,
	groupId: string,
): Promise<EvaluationParticipantDetailData["teamObservations"]> {
	const observations = await db.teamTaskObservation.findMany({
		where: {
			groupId,
			deletedAt: null,
			notes: { not: null },
			task: {
				assessmentCenterId: acId,
				deletedAt: null,
				isTeamTask: true,
			},
		},
		select: {
			notes: true,
			updatedAt: true,
			task: {
				select: { id: true, name: true },
			},
			reviewer: {
				select: {
					user: { select: { name: true } },
				},
			},
		},
		orderBy: [{ task: { name: "asc" } }, { updatedAt: "asc" }],
	});

	const byTask = new Map<
		string,
		EvaluationParticipantDetailData["teamObservations"][number]
	>();

	for (const observation of observations) {
		if (observation.notes === null || observation.notes.trim() === "") {
			continue;
		}

		const bucket = byTask.get(observation.task.id) ?? {
			taskId: observation.task.id,
			taskName: observation.task.name,
			entries: [],
		};
		bucket.entries.push({
			reviewerName: observation.reviewer.user.name,
			notes: observation.notes,
			updatedAt: observation.updatedAt,
		});
		byTask.set(observation.task.id, bucket);
	}

	return Array.from(byTask.values());
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

	const groupId = await fetchParticipantGroupId(acId, participantId);
	const teamObservations = groupId
		? await fetchTeamObservations(acId, groupId)
		: [];

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
		teamObservations,
	};
}
