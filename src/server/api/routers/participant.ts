import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const participantRouter = createTRPCRouter({
	listByAc: protectedProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.participant.findMany({
				where: { assessmentCenterId: input.acId, deletedAt: null },
				select: { id: true, name: true, email: true, avatarUrl: true },
				orderBy: { name: "asc" },
			});
		}),

	create: protectedProcedure
		.input(
			z.object({
				acId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				email: z.string().trim().email("Ungültige E-Mail-Adresse").optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Teilnehmer hinzufügen",
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

			return ctx.db.participant.create({
				data: {
					assessmentCenterId: input.acId,
					name: input.name,
					email: input.email ?? null,
				},
				select: { id: true, name: true, email: true },
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				acId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				email: z.string().trim().email("Ungültige E-Mail-Adresse").optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Teilnehmer bearbeiten",
				});
			}

			const participant = await ctx.db.participant.findFirst({
				where: {
					id: input.id,
					assessmentCenterId: input.acId,
					deletedAt: null,
				},
				select: {
					id: true,
					assessmentCenter: { select: { status: true } },
				},
			});

			if (!participant) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Teilnehmer nicht gefunden",
				});
			}

			if (participant.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

			return ctx.db.participant.update({
				where: { id: input.id },
				data: { name: input.name, email: input.email ?? null },
				select: { id: true, name: true, email: true },
			});
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Teilnehmer entfernen",
				});
			}

			const participant = await ctx.db.participant.findFirst({
				where: {
					id: input.id,
					assessmentCenterId: input.acId,
					deletedAt: null,
				},
				select: {
					id: true,
					assessmentCenter: { select: { status: true } },
				},
			});

			if (!participant) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Teilnehmer nicht gefunden",
				});
			}

			if (participant.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

			await ctx.db.participantGroupMembership.deleteMany({
				where: { participantId: input.id },
			});

			await ctx.db.participant.update({
				where: { id: input.id },
				data: { deletedAt: new Date() },
			});
		}),
});
