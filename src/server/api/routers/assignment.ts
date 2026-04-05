import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const DRAFT_ONLY_MSG =
	"Einrichtung kann nach Aktivierung nicht mehr geändert werden";

export const assignmentRouter = createTRPCRouter({
	listByAc: protectedProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.reviewerAssignment.findMany({
				where: { reviewer: { assessmentCenterId: input.acId } },
				select: {
					id: true,
					reviewerId: true,
					participantId: true,
					taskId: true,
					reviewer: {
						select: { user: { select: { id: true, name: true } } },
					},
				},
				orderBy: { createdAt: "asc" },
			});
		}),

	create: protectedProcedure
		.input(
			z.object({
				acId: z.string(),
				reviewerId: z.string(),
				participantId: z.string(),
				taskId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Zuweisungen erstellen",
				});
			}

			const [ac, reviewer, participant, task] = await Promise.all([
				ctx.db.assessmentCenter.findFirst({
					where: { id: input.acId, deletedAt: null },
					select: { id: true, status: true },
				}),
				ctx.db.reviewer.findFirst({
					where: { id: input.reviewerId, assessmentCenterId: input.acId },
					select: { id: true },
				}),
				ctx.db.participant.findFirst({
					where: {
						id: input.participantId,
						assessmentCenterId: input.acId,
						deletedAt: null,
					},
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

			if (!reviewer) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Bewerter gehört nicht zu diesem Assessment Center",
				});
			}

			if (!participant) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Teilnehmer gehört nicht zu diesem Assessment Center",
				});
			}

			if (!task) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Aufgabe gehört nicht zu diesem Assessment Center",
				});
			}

			const existing = await ctx.db.reviewerAssignment.findUnique({
				where: {
					reviewerId_participantId_taskId: {
						reviewerId: input.reviewerId,
						participantId: input.participantId,
						taskId: input.taskId,
					},
				},
				select: { id: true },
			});

			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Diese Zuweisung existiert bereits",
				});
			}

			return ctx.db.reviewerAssignment.create({
				data: {
					reviewerId: input.reviewerId,
					participantId: input.participantId,
					taskId: input.taskId,
				},
				select: {
					id: true,
					reviewerId: true,
					participantId: true,
					taskId: true,
				},
			});
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Zuweisungen entfernen",
				});
			}

			const assignment = await ctx.db.reviewerAssignment.findFirst({
				where: {
					id: input.id,
					reviewer: { assessmentCenterId: input.acId },
				},
				select: {
					id: true,
					reviewer: {
						select: {
							assessmentCenter: { select: { status: true } },
						},
					},
				},
			});

			if (!assignment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Zuweisung nicht gefunden",
				});
			}

			if (assignment.reviewer.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			await ctx.db.reviewerAssignment.delete({ where: { id: input.id } });
		}),
});
