import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { buildParticipantDashboardSnapshot } from "@/modules/evaluation/server/participant-dashboard-snapshot";
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
					createdAt: true,
				},
				orderBy: { createdAt: "desc" },
			});
		}

		return ctx.db.assessmentCenter.findMany({
			where: {
				deletedAt: null,
				reviewers: { some: { userId } },
			},
			select: {
				id: true,
				name: true,
				description: true,
				status: true,
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

			if (ac.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

			await ctx.db.assessmentCenter.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: input.description ?? null,
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

			if (ac.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

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

			if (day.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

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

			const participantDashboardSnapshot =
				await buildParticipantDashboardSnapshot(input.id);

			await ctx.db.assessmentCenter.update({
				where: { id: input.id },
				data: {
					status: "COMPLETED",
					participantDashboardSnapshot,
				},
			});
		}),
});
