import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const quantitativeInput = z.object({
	acId: z.string(),
	taskId: z.string(),
	participantId: z.string(),
	criteriaId: z.string(),
	value: z.number().int().min(1).max(5),
});

const qualitativeInput = z.object({
	acId: z.string(),
	taskId: z.string(),
	participantId: z.string(),
	criteriaId: z.string(),
	text: z.string().trim().min(1).max(10_000),
});

const teamObservationInput = z.object({
	acId: z.string(),
	taskId: z.string(),
	participantId: z.string(),
	notes: z.string().trim().max(10_000),
});

type ReviewAccessContext = {
	sessionUserId: string;
	db: Parameters<
		Parameters<typeof protectedProcedure.mutation>[0]
	>[0]["ctx"]["db"];
};

async function getAssignmentAccess(
	ctx: ReviewAccessContext,
	input: {
		acId: string;
		taskId: string;
		participantId: string;
	},
) {
	const assignment = await ctx.db.reviewerAssignment.findFirst({
		where: {
			taskId: input.taskId,
			participantId: input.participantId,
			reviewer: {
				assessmentCenterId: input.acId,
				userId: ctx.sessionUserId,
			},
			task: {
				assessmentCenterId: input.acId,
				deletedAt: null,
			},
			participant: {
				assessmentCenterId: input.acId,
				deletedAt: null,
			},
		},
		select: {
			id: true,
			reviewerId: true,
			task: {
				select: {
					id: true,
					isTeamTask: true,
					assessmentCenter: {
						select: { status: true },
					},
				},
			},
			participant: {
				select: {
					groupMemberships: {
						select: { groupId: true },
						orderBy: { createdAt: "asc" },
						take: 1,
					},
				},
			},
		},
	});

	if (!assignment) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bewertungszuweisung nicht gefunden",
		});
	}

	if (assignment.task.assessmentCenter.status === "DRAFT") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Bewertungen sind erst ab dem aktiven Assessment Center möglich",
		});
	}

	return assignment;
}

async function getCriteria(
	ctx: ReviewAccessContext,
	taskId: string,
	criteriaId: string,
) {
	const criteria = await ctx.db.reviewCriteria.findFirst({
		where: {
			id: criteriaId,
			taskId,
			deletedAt: null,
		},
		select: {
			id: true,
			type: true,
		},
	});

	if (!criteria) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Kriterium nicht gefunden",
		});
	}

	return criteria;
}

export const ratingRouter = createTRPCRouter({
	upsertQuantitative: protectedProcedure
		.input(quantitativeInput)
		.mutation(async ({ ctx, input }) => {
			const access = await getAssignmentAccess(
				{ db: ctx.db, sessionUserId: ctx.session.user.id },
				input,
			);
			const criteria = await getCriteria(
				{ db: ctx.db, sessionUserId: ctx.session.user.id },
				input.taskId,
				input.criteriaId,
			);

			if (criteria.type !== "QUANTITATIVE") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Dieses Kriterium erwartet keine numerische Bewertung",
				});
			}

			return ctx.db.quantitativeRating.upsert({
				where: {
					reviewerAssignmentId_criteriaId: {
						reviewerAssignmentId: access.id,
						criteriaId: input.criteriaId,
					},
				},
				create: {
					reviewerAssignmentId: access.id,
					criteriaId: input.criteriaId,
					value: input.value,
				},
				update: {
					value: input.value,
					deletedAt: null,
				},
				select: {
					id: true,
					value: true,
					updatedAt: true,
				},
			});
		}),

	upsertQualitative: protectedProcedure
		.input(qualitativeInput)
		.mutation(async ({ ctx, input }) => {
			const access = await getAssignmentAccess(
				{ db: ctx.db, sessionUserId: ctx.session.user.id },
				input,
			);
			const criteria = await getCriteria(
				{ db: ctx.db, sessionUserId: ctx.session.user.id },
				input.taskId,
				input.criteriaId,
			);

			if (criteria.type !== "QUALITATIVE") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Dieses Kriterium erwartet keine Textbewertung",
				});
			}

			return ctx.db.qualitativeRating.upsert({
				where: {
					reviewerAssignmentId_criteriaId: {
						reviewerAssignmentId: access.id,
						criteriaId: input.criteriaId,
					},
				},
				create: {
					reviewerAssignmentId: access.id,
					criteriaId: input.criteriaId,
					text: input.text,
				},
				update: {
					text: input.text,
					deletedAt: null,
				},
				select: {
					id: true,
					text: true,
					updatedAt: true,
				},
			});
		}),

	upsertTeamObservation: protectedProcedure
		.input(teamObservationInput)
		.mutation(async ({ ctx, input }) => {
			const access = await getAssignmentAccess(
				{ db: ctx.db, sessionUserId: ctx.session.user.id },
				input,
			);

			if (!access.task.isTeamTask) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Teambeobachtungen sind nur für Gruppenaufgaben möglich",
				});
			}

			const groupId = access.participant.groupMemberships[0]?.groupId;
			if (!groupId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Bewerbende ist keiner Gruppe zugeordnet",
				});
			}

			if (input.notes === "") {
				await ctx.db.teamTaskObservation.updateMany({
					where: {
						taskId: input.taskId,
						groupId,
						reviewerId: access.reviewerId,
						deletedAt: null,
					},
					data: { deletedAt: new Date() },
				});

				return { notes: null as string | null };
			}

			return ctx.db.teamTaskObservation.upsert({
				where: {
					taskId_groupId_reviewerId: {
						taskId: input.taskId,
						groupId,
						reviewerId: access.reviewerId,
					},
				},
				create: {
					taskId: input.taskId,
					groupId,
					reviewerId: access.reviewerId,
					notes: input.notes,
				},
				update: {
					notes: input.notes,
					deletedAt: null,
				},
				select: {
					id: true,
					notes: true,
					updatedAt: true,
				},
			});
		}),
});
