import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assignPseudonyms } from "@/modules/assessment-center/server/anonymization";
import { assertAcEditable } from "@/server/api/ac-lock";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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

	getById: protectedProcedure
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

	getDetails: protectedProcedure
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

			return ac;
		}),

	getSetupProgress: protectedProcedure
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

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				isDemo: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Assessment Centers erstellen",
				});
			}

			return ctx.db.assessmentCenter.create({
				data: {
					name: input.name,
					description: input.description,
					isDemo: input.isDemo,
				},
				select: { id: true },
			});
		}),

	updateDetails: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				isDemo: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Details bearbeiten",
				});
			}

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
					isDemo: input.isDemo,
				},
			});
		}),

	addDay: protectedProcedure
		.input(
			z.object({
				acId: z.string(),
				date: z.string().date("Ungültiges Datum"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Tage hinzufügen",
				});
			}

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

	removeDay: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Tage entfernen",
				});
			}

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

	transitionToActive: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können den Status ändern",
				});
			}

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

	transitionToCompleted: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können den Status ändern",
				});
			}

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

	reopen: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können den Status ändern",
				});
			}

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

			await ctx.db.assessmentCenter.update({
				where: { id: input.id },
				data: { status: "ACTIVE" },
			});
		}),

	/**
	 * Removes personal data after a completed AC: participants and groups get
	 * pseudonyms, contact fields are cleared, free-text ratings and group
	 * observations are deleted, soft-deleted participants are purged.
	 * Quantitative ratings and the AC structure stay for cohort comparisons.
	 */
	anonymize: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Assessment Center anonymisieren",
				});
			}

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
						"Nur abgeschlossene Assessment Center können anonymisiert werden",
				});
			}

			const assessmentCenterId = input.id;

			await ctx.db.$transaction(async (tx) => {
				await tx.participant.deleteMany({
					where: { assessmentCenterId, deletedAt: { not: null } },
				});
				await tx.qualitativeRating.deleteMany({
					where: {
						reviewerAssignment: { participant: { assessmentCenterId } },
					},
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

				const groupNames = assignPseudonyms(
					groups.map((group) => group.id),
					"Gruppe",
					null,
				);
				for (const [id, name] of groupNames) {
					await tx.participantGroup.update({ where: { id }, data: { name } });
				}

				await tx.assessmentCenter.update({
					where: { id: assessmentCenterId },
					data: { status: "ANONYMIZED", anonymizedAt: new Date() },
				});
			});
		}),

	/** Deletes the AC with everything attached to it (cascade), e.g. demos. */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Assessment Center löschen",
				});
			}

			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: input.id },
				select: { id: true },
			});

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			await ctx.db.assessmentCenter.delete({ where: { id: input.id } });
		}),
});
