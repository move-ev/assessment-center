import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	getQualitativeWrite,
	QUALITATIVE_TEXT_MAX_LENGTH,
} from "@/lib/qualitative-write";
import {
	assertRatingScaleMax,
	isValidRating,
	RATING_SCALE_MAXIMUMS,
	type RatingScaleMax,
} from "@/lib/rating-scale";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { Prisma } from "../../../../generated/prisma/client";

const quantitativeInput = z.object({
	acId: z.string(),
	taskId: z.string(),
	participantId: z.string(),
	criteriaId: z.string(),
	// Upper bound of the largest scale; the AC's own scale is checked on write.
	value: z
		.number()
		.int()
		.min(1)
		.max(Math.max(...RATING_SCALE_MAXIMUMS)),
});

const qualitativeInput = z.object({
	acId: z.string(),
	taskId: z.string(),
	participantId: z.string(),
	criteriaId: z.string(),
	// Empty or blank clears the entry (see getQualitativeWrite).
	text: z.string().max(QUALITATIVE_TEXT_MAX_LENGTH),
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

	if (assignment.task.assessmentCenter.status === "ANONYMIZED") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Anonymisierte Assessment Center können nicht mehr bewertet werden",
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

/**
 * Runs a rating write while holding a share lock on the AC row. Anonymizing
 * and changing the rating scale lock that row first, so they wait for writes
 * in flight, and writes that start later see the new state. Without the lock
 * a write that passed its checks could land after anonymization deleted free
 * texts, or on a scale that changed in between.
 */
async function writeUnlessAnonymized<T>(
	db: ReviewAccessContext["db"],
	acId: string,
	write: (
		tx: Prisma.TransactionClient,
		ac: { ratingScaleMax: RatingScaleMax },
	) => Promise<T>,
): Promise<T> {
	return db.$transaction(async (tx) => {
		const [ac] = await tx.$queryRaw<
			Array<{ status: string; ratingScaleMax: number }>
		>`
			SELECT status, "ratingScaleMax" FROM "AssessmentCenter"
			WHERE id = ${acId} FOR SHARE`;

		if (!ac) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Assessment Center nicht gefunden",
			});
		}

		if (ac.status === "ANONYMIZED") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message:
					"Anonymisierte Assessment Center können nicht mehr bewertet werden",
			});
		}

		return write(tx, {
			ratingScaleMax: assertRatingScaleMax(ac.ratingScaleMax),
		});
	});
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

			return writeUnlessAnonymized(ctx.db, input.acId, (tx, ac) => {
				if (!isValidRating(input.value, ac.ratingScaleMax)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Bewertungen sind nur von 1 bis ${ac.ratingScaleMax} möglich`,
					});
				}

				return tx.quantitativeRating.upsert({
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

			const write = getQualitativeWrite(input.text);
			const key = {
				reviewerAssignmentId: access.id,
				criteriaId: input.criteriaId,
			};

			return writeUnlessAnonymized(ctx.db, input.acId, async (tx) => {
				if (write.kind === "DELETE") {
					await tx.qualitativeRating.deleteMany({ where: key });
					return { deleted: true as const };
				}

				const saved = await tx.qualitativeRating.upsert({
					where: { reviewerAssignmentId_criteriaId: key },
					create: { ...key, text: write.text },
					update: { text: write.text, deletedAt: null },
					select: { id: true, text: true, updatedAt: true },
				});
				return { deleted: false as const, ...saved };
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
				await writeUnlessAnonymized(ctx.db, input.acId, (tx) =>
					tx.teamTaskObservation.updateMany({
						where: {
							taskId: input.taskId,
							groupId,
							reviewerId: access.reviewerId,
							deletedAt: null,
						},
						data: { deletedAt: new Date() },
					}),
				);

				return { notes: null as string | null };
			}

			return writeUnlessAnonymized(ctx.db, input.acId, (tx) =>
				tx.teamTaskObservation.upsert({
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
				}),
			);
		}),
});
