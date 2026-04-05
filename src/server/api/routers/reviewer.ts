import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const DRAFT_ONLY_MSG =
	"Einrichtung kann nach Aktivierung nicht mehr geändert werden";

export const reviewerRouter = createTRPCRouter({
	listByAc: protectedProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.reviewer.findMany({
				where: { assessmentCenterId: input.acId },
				select: {
					id: true,
					userId: true,
					user: { select: { id: true, name: true, email: true } },
				},
				orderBy: { createdAt: "asc" },
			});
		}),

	searchUsers: protectedProcedure
		.input(
			z.object({
				acId: z.string(),
				query: z.string().trim().min(1),
			}),
		)
		.query(async ({ ctx, input }) => {
			const existingReviewerUserIds = await ctx.db.reviewer
				.findMany({
					where: { assessmentCenterId: input.acId },
					select: { userId: true },
				})
				.then((rs) => rs.map((r) => r.userId));

			return ctx.db.user.findMany({
				where: {
					id:
						existingReviewerUserIds.length > 0
							? { notIn: existingReviewerUserIds }
							: undefined,
					OR: [
						{ name: { contains: input.query, mode: "insensitive" } },
						{ email: { contains: input.query, mode: "insensitive" } },
					],
				},
				select: { id: true, name: true, email: true },
				take: 10,
				orderBy: { name: "asc" },
			});
		}),

	add: protectedProcedure
		.input(z.object({ acId: z.string(), userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Bewerter hinzufügen",
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
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			const user = await ctx.db.user.findUnique({
				where: { id: input.userId },
				select: { id: true },
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Benutzer nicht gefunden",
				});
			}

			return ctx.db.reviewer.create({
				data: { assessmentCenterId: input.acId, userId: input.userId },
				select: {
					id: true,
					userId: true,
					user: { select: { id: true, name: true, email: true } },
				},
			});
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Bewerter entfernen",
				});
			}

			const reviewer = await ctx.db.reviewer.findFirst({
				where: { id: input.id, assessmentCenterId: input.acId },
				select: {
					id: true,
					assessmentCenter: { select: { status: true } },
				},
			});

			if (!reviewer) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Bewerter nicht gefunden",
				});
			}

			if (reviewer.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			await ctx.db.reviewerAssignment.deleteMany({
				where: { reviewerId: input.id },
			});

			await ctx.db.teamTaskObservation.deleteMany({
				where: { reviewerId: input.id },
			});

			await ctx.db.reviewer.delete({ where: { id: input.id } });
		}),
});
