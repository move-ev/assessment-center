import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const DRAFT_ONLY_MSG =
	"Einrichtung kann nach Aktivierung nicht mehr geändert werden";

export const scheduleRouter = createTRPCRouter({
	listByAc: protectedProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.scheduleEntry.findMany({
				where: { day: { assessmentCenterId: input.acId } },
				select: {
					id: true,
					dayId: true,
					groupId: true,
					taskId: true,
					orderIndex: true,
					task: { select: { name: true } },
				},
				orderBy: [{ dayId: "asc" }, { groupId: "asc" }, { orderIndex: "asc" }],
			});
		}),

	createEntry: protectedProcedure
		.input(
			z.object({
				acId: z.string(),
				dayId: z.string(),
				groupId: z.string(),
				taskId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können den Zeitplan bearbeiten",
				});
			}

			const [ac, day, group, task] = await Promise.all([
				ctx.db.assessmentCenter.findFirst({
					where: { id: input.acId, deletedAt: null },
					select: { id: true, status: true },
				}),
				ctx.db.assessmentDay.findFirst({
					where: { id: input.dayId, assessmentCenterId: input.acId },
					select: { id: true },
				}),
				ctx.db.participantGroup.findFirst({
					where: { id: input.groupId, assessmentCenterId: input.acId },
					select: { id: true },
				}),
				ctx.db.task.findFirst({
					where: {
						id: input.taskId,
						assessmentCenterId: input.acId,
						deletedAt: null,
					},
					select: { id: true },
				}),
			]);

			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}

			if (ac.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			if (!day) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Tag gehört nicht zu diesem Assessment Center",
				});
			}

			if (!group) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Gruppe gehört nicht zu diesem Assessment Center",
				});
			}

			if (!task) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Aufgabe gehört nicht zu diesem Assessment Center",
				});
			}

			const existing = await ctx.db.scheduleEntry.findUnique({
				where: {
					dayId_groupId_taskId: {
						dayId: input.dayId,
						groupId: input.groupId,
						taskId: input.taskId,
					},
				},
				select: { id: true },
			});

			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Diese Aufgabe ist für diese Gruppe an diesem Tag bereits eingeplant",
				});
			}

			const maxEntry = await ctx.db.scheduleEntry.findFirst({
				where: { dayId: input.dayId, groupId: input.groupId },
				select: { orderIndex: true },
				orderBy: { orderIndex: "desc" },
			});

			const orderIndex = maxEntry ? maxEntry.orderIndex + 1 : 0;

			return ctx.db.scheduleEntry.create({
				data: {
					dayId: input.dayId,
					groupId: input.groupId,
					taskId: input.taskId,
					orderIndex,
				},
				select: {
					id: true,
					dayId: true,
					groupId: true,
					taskId: true,
					orderIndex: true,
				},
			});
		}),

	removeEntry: protectedProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können den Zeitplan bearbeiten",
				});
			}

			const entry = await ctx.db.scheduleEntry.findFirst({
				where: { id: input.id, day: { assessmentCenterId: input.acId } },
				select: {
					id: true,
					day: {
						select: { assessmentCenter: { select: { status: true } } },
					},
				},
			});

			if (!entry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Zeitplaneintrag nicht gefunden",
				});
			}

			if (entry.day.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			await ctx.db.scheduleEntry.delete({ where: { id: input.id } });
		}),

	reorderEntry: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				acId: z.string(),
				direction: z.enum(["up", "down"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können den Zeitplan bearbeiten",
				});
			}

			const entry = await ctx.db.scheduleEntry.findFirst({
				where: { id: input.id, day: { assessmentCenterId: input.acId } },
				select: {
					id: true,
					dayId: true,
					groupId: true,
					orderIndex: true,
					day: {
						select: { assessmentCenter: { select: { status: true } } },
					},
				},
			});

			if (!entry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Zeitplaneintrag nicht gefunden",
				});
			}

			if (entry.day.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			const adjacent = await ctx.db.scheduleEntry.findFirst({
				where: {
					dayId: entry.dayId,
					groupId: entry.groupId,
					orderIndex:
						input.direction === "up"
							? { lt: entry.orderIndex }
							: { gt: entry.orderIndex },
				},
				orderBy: {
					orderIndex: input.direction === "up" ? "desc" : "asc",
				},
				select: { id: true, orderIndex: true },
			});

			if (!adjacent) {
				return; // Already at boundary — no-op
			}

			await ctx.db.$transaction([
				ctx.db.scheduleEntry.update({
					where: { id: entry.id },
					data: { orderIndex: adjacent.orderIndex },
				}),
				ctx.db.scheduleEntry.update({
					where: { id: adjacent.id },
					data: { orderIndex: entry.orderIndex },
				}),
			]);
		}),
});
