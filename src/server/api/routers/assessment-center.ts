import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AcStatus } from "@/lib/ac-status";
import { assignPseudonyms, numberInOrder } from "@/lib/pseudonyms";
import { assertRatingScaleMax, isRatingScaleMax } from "@/lib/rating-scale";
import { assertAcEditable } from "@/server/api/ac-lock";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "@/server/api/trpc";
import type { PrismaClient } from "../../../../generated/prisma/client";

function countQuantitativeRatings(
	db: Pick<PrismaClient, "quantitativeRating">,
	assessmentCenterId: string,
): Promise<number> {
	return db.quantitativeRating.count({
		where: {
			deletedAt: null,
			reviewerAssignment: { reviewer: { assessmentCenterId } },
		},
	});
}

/** Irreversible actions require the AC name, checked again on the server. */
function assertConfirmedName(confirmName: string, acName: string): void {
	if (confirmName.trim() !== acName.trim()) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Der eingegebene Name stimmt nicht mit dem AC-Namen überein",
		});
	}
}

export const assessmentCenterRouter = createTRPCRouter({
	listForUser: protectedProcedure.query(async ({ ctx }) => {
		const { id: userId, role } = ctx.session.user;
		const isAdmin = role === "admin";

		if (isAdmin) {
			return ctx.db.assessmentCenter.findMany({
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					description: true,
					status: true,
					isDemo: true,
					createdAt: true,
				},
				orderBy: { createdAt: "desc" },
			});
		}

		return ctx.db.assessmentCenter.findMany({
			where: {
				deletedAt: null,
				status: { not: "ANONYMIZED" },
				reviewers: { some: { userId } },
			},
			select: {
				id: true,
				name: true,
				description: true,
				status: true,
				isDemo: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
		});
	}),

	getById: adminProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: {
					id: true,
					name: true,
					description: true,
					status: true,
				},
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			return ac;
		}),

	getDetails: adminProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: {
					id: true,
					name: true,
					description: true,
					status: true,
					isDemo: true,
					anonymizedAt: true,
					ratingScaleMax: true,
					days: {
						select: { id: true, date: true },
						orderBy: { date: "asc" },
					},
				},
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			const ratingCount = await countQuantitativeRatings(ctx.db, ac.id);

			return {
				...ac,
				ratingScaleMax: assertRatingScaleMax(ac.ratingScaleMax),
				hasRatings: ratingCount > 0,
			};
		}),

	getSetupProgress: adminProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			const [
				dayCount,
				participantCount,
				groupCount,
				taskCount,
				scheduleEntryCount,
				reviewerCount,
				assignmentCount,
			] = await Promise.all([
				ctx.db.assessmentDay.count({
					where: { assessmentCenterId: input.acId },
				}),
				ctx.db.participant.count({
					where: { assessmentCenterId: input.acId, deletedAt: null },
				}),
				ctx.db.participantGroup.count({
					where: { assessmentCenterId: input.acId },
				}),
				ctx.db.task.count({
					where: { assessmentCenterId: input.acId, deletedAt: null },
				}),
				ctx.db.scheduleEntry.count({
					where: { day: { assessmentCenterId: input.acId } },
				}),
				ctx.db.reviewer.count({
					where: { assessmentCenterId: input.acId },
				}),
				ctx.db.reviewerAssignment.count({
					where: { reviewer: { assessmentCenterId: input.acId } },
				}),
			]);

			return {
				dayCount,
				participantCount,
				groupCount,
				taskCount,
				scheduleEntryCount,
				reviewerCount,
				assignmentCount,
			};
		}),

	create: adminProcedure
		.input(
			z.object({
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				isDemo: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.assessmentCenter.create({
				data: {
					name: input.name,
					description: input.description,
					isDemo: input.isDemo,
				},
				select: { id: true },
			});
		}),

	updateDetails: adminProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true, status: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			assertAcEditable(ac.status);

			await ctx.db.assessmentCenter.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: input.description ?? null,
				},
			});
		}),

	/**
	 * The scale can only change before anyone has rated, so existing ratings
	 * never end up on a different scale than the one they were given on.
	 */
	setRatingScale: adminProcedure
		.input(
			z.object({
				id: z.string(),
				ratingScaleMax: z
					.number()
					.int()
					.refine(isRatingScaleMax, "Unbekannte Bewertungsskala"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true, status: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			assertAcEditable(ac.status);

			await ctx.db.$transaction(async (tx) => {
				// Rating writes hold a share lock on this row; locking it here
				// makes the count below see every rating that was saved. The
				// status is read again under the lock, since the AC may have been
				// completed or anonymized while this request waited.
				const [locked] = await tx.$queryRaw<Array<{ status: AcStatus }>>`
					SELECT status FROM "AssessmentCenter" WHERE id = ${ac.id} FOR UPDATE`;

				if (!locked) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Assessment Center nicht gefunden",
					});
				}

				assertAcEditable(locked.status);

				if ((await countQuantitativeRatings(tx, ac.id)) > 0) {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"Die Bewertungsskala kann nicht mehr geändert werden, weil bereits Bewertungen vorliegen",
					});
				}

				await tx.assessmentCenter.update({
					where: { id: ac.id },
					data: { ratingScaleMax: input.ratingScaleMax },
				});
			});
		}),

	/** Allowed in every status: a finished AC may turn out to be a demo. */
	setDemo: adminProcedure
		.input(z.object({ id: z.string(), isDemo: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			const { count } = await ctx.db.assessmentCenter.updateMany({
				where: { id: input.id, deletedAt: null },
				data: { isDemo: input.isDemo },
			});

			if (count === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}
		}),

	addDay: adminProcedure
		.input(
			z.object({
				acId: z.string(),
				date: z.string().date("Ungültiges Datum"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.acId, deletedAt: null },
				select: { id: true, status: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			assertAcEditable(ac.status);

			const date = new Date(`${input.date}T00:00:00.000Z`);

			return ctx.db.assessmentDay.upsert({
				where: {
					assessmentCenterId_date: {
						assessmentCenterId: input.acId,
						date,
					},
				},
				create: { assessmentCenterId: input.acId, date },
				update: {},
				select: { id: true, date: true },
			});
		}),

	removeDay: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const day = await ctx.db.assessmentDay.findUnique({
				where: { id: input.id },
				select: {
					_count: { select: { scheduleEntries: true } },
					assessmentCenter: { select: { status: true } },
				},
			});

			if (!day) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Tag nicht gefunden",
				});
			}

			assertAcEditable(day.assessmentCenter.status);

			if (day._count.scheduleEntries > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Tag ist im Zeitplan eingetragen und kann nicht gelöscht werden",
				});
			}

			await ctx.db.assessmentDay.delete({ where: { id: input.id } });
		}),

	transitionToActive: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true, status: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			if (ac.status !== "DRAFT") {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Nur Entwürfe können aktiviert werden",
				});
			}

			const [
				dayCount,
				participantCount,
				groupCount,
				taskCount,
				scheduleCount,
				reviewerCount,
				assignmentCount,
			] = await Promise.all([
				ctx.db.assessmentDay.count({ where: { assessmentCenterId: input.id } }),
				ctx.db.participant.count({
					where: { assessmentCenterId: input.id, deletedAt: null },
				}),
				ctx.db.participantGroup.count({
					where: { assessmentCenterId: input.id },
				}),
				ctx.db.task.count({
					where: { assessmentCenterId: input.id, deletedAt: null },
				}),
				ctx.db.scheduleEntry.count({
					where: { day: { assessmentCenterId: input.id } },
				}),
				ctx.db.reviewer.count({ where: { assessmentCenterId: input.id } }),
				ctx.db.reviewerAssignment.count({
					where: { reviewer: { assessmentCenterId: input.id } },
				}),
			]);

			const allStepsComplete =
				dayCount > 0 &&
				participantCount > 0 &&
				groupCount > 0 &&
				taskCount > 0 &&
				scheduleCount > 0 &&
				reviewerCount > 0 &&
				assignmentCount > 0;

			if (!allStepsComplete) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Alle Einrichtungsschritte müssen abgeschlossen sein, um das AC zu aktivieren",
				});
			}

			await ctx.db.assessmentCenter.update({
				where: { id: input.id },
				data: { status: "ACTIVE" },
			});
		}),

	transitionToCompleted: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true, status: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			if (ac.status !== "ACTIVE") {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Nur aktive Assessment Center können abgeschlossen werden",
				});
			}

			await ctx.db.assessmentCenter.update({
				where: { id: input.id },
				data: { status: "COMPLETED" },
			});
		}),

	reopen: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true, status: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			if (ac.status !== "COMPLETED") {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Nur abgeschlossene Assessment Center können wieder geöffnet werden",
				});
			}

			// Conditional on the status, so a concurrent anonymization wins.
			const { count } = await ctx.db.assessmentCenter.updateMany({
				where: { id: input.id, status: "COMPLETED" },
				data: { status: "ACTIVE" },
			});

			if (count === 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Der Status des Assessment Centers hat sich geändert",
				});
			}
		}),

	/**
	 * Removes personal data after a completed AC: participants and groups get
	 * pseudonyms, contact fields and rating notes are cleared, free-text
	 * ratings and group observations are deleted, soft-deleted participants
	 * are purged.
	 * Quantitative ratings and the AC structure stay for cohort comparisons.
	 */
	anonymize: adminProcedure
		.input(z.object({ id: z.string(), confirmName: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true, name: true, status: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			if (ac.status !== "COMPLETED") {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Nur abgeschlossene Assessment Center können anonymisiert werden",
				});
			}

			assertConfirmedName(input.confirmName, ac.name);

			const assessmentCenterId = input.id;

			await ctx.db.$transaction(
				async (tx) => {
					// Status first and conditional: locks the row, so a concurrent
					// reopen waits and then finds the AC anonymized.
					const { count } = await tx.assessmentCenter.updateMany({
						where: { id: assessmentCenterId, status: "COMPLETED" },
						data: { status: "ANONYMIZED", anonymizedAt: new Date() },
					});

					if (count === 0) {
						throw new TRPCError({
							code: "CONFLICT",
							message: "Der Status des Assessment Centers hat sich geändert",
						});
					}

					await tx.participant.deleteMany({
						where: { assessmentCenterId, deletedAt: { not: null } },
					});
					await tx.qualitativeRating.deleteMany({
						where: {
							reviewerAssignment: { participant: { assessmentCenterId } },
						},
					});
					await tx.quantitativeRating.updateMany({
						where: {
							reviewerAssignment: { participant: { assessmentCenterId } },
							notes: { not: null },
						},
						data: { notes: null },
					});
					await tx.teamTaskObservation.deleteMany({
						where: { task: { assessmentCenterId } },
					});

					const [participants, groups] = await Promise.all([
						tx.participant.findMany({
							where: { assessmentCenterId },
							select: { id: true },
						}),
						tx.participantGroup.findMany({
							where: { assessmentCenterId },
							select: { id: true },
							orderBy: { createdAt: "asc" },
						}),
					]);

					const participantNames = assignPseudonyms(
						participants.map((participant) => participant.id),
						"Bewerbende",
					);
					for (const [id, name] of participantNames) {
						await tx.participant.update({
							where: { id },
							data: { name, email: null, avatarUrl: null, avatarFileKey: null },
						});
					}

					const groupNames = numberInOrder(
						groups.map((group) => group.id),
						"Gruppe",
					);
					for (const [id, name] of groupNames) {
						await tx.participantGroup.update({ where: { id }, data: { name } });
					}
				},
				// One update per participant; generous limit for large ACs.
				{ timeout: 30_000 },
			);
		}),

	/** Deletes the AC with everything attached to it (cascade), e.g. demos. */
	delete: adminProcedure
		.input(z.object({ id: z.string(), confirmName: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id },
				select: { id: true, name: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			assertConfirmedName(input.confirmName, ac.name);

			await ctx.db.assessmentCenter.delete({ where: { id: input.id } });
		}),
});
