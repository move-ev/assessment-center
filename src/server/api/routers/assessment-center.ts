import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const assessmentCenterRouter = createTRPCRouter({
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
					message: "Assessment Center not found",
				});
			}

			return ac;
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().min(1, "Name is required"),
				description: z.string().trim().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins can create Assessment Centers",
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
});
