import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const groupRouter = createTRPCRouter({
	listByAc: protectedProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.participantGroup.findMany({
				where: { assessmentCenterId: input.acId },
				select: {
					id: true,
					name: true,
					memberships: {
						select: {
							participantId: true,
							participant: {
								select: { id: true, name: true },
							},
						},
						where: { participant: { deletedAt: null } },
					},
				},
				orderBy: { createdAt: "asc" },
			});
		}),

	create: protectedProcedure
		.input(
			z.object({
				acId: z.string(),
				name: z.string().trim().min(1, "Gruppenname ist erforderlich"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Gruppen erstellen",
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

			return ctx.db.participantGroup.create({
				data: { assessmentCenterId: input.acId, name: input.name },
				select: { id: true, name: true },
			});
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Gruppen löschen",
				});
			}

			const group = await ctx.db.participantGroup.findFirst({
				where: { id: input.id, assessmentCenterId: input.acId },
				select: {
					id: true,
					assessmentCenter: { select: { status: true } },
					_count: { select: { scheduleEntries: true } },
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Gruppe nicht gefunden",
				});
			}

			if (group.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

			if (group._count.scheduleEntries > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Gruppe ist im Zeitplan eingetragen und kann nicht gelöscht werden",
				});
			}

			await ctx.db.teamTaskObservation.deleteMany({
				where: { groupId: input.id },
			});
			await ctx.db.participantGroupMembership.deleteMany({
				where: { groupId: input.id },
			});
			await ctx.db.participantGroup.delete({ where: { id: input.id } });
		}),

	assignParticipant: protectedProcedure
		.input(
			z.object({
				groupId: z.string(),
				participantId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Teilnehmer zuweisen",
				});
			}

			const group = await ctx.db.participantGroup.findUnique({
				where: { id: input.groupId },
				select: {
					assessmentCenterId: true,
					assessmentCenter: { select: { status: true } },
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Gruppe nicht gefunden",
				});
			}

			if (group.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

			// Verify the participant belongs to the same AC and is active
			const participant = await ctx.db.participant.findFirst({
				where: {
					id: input.participantId,
					assessmentCenterId: group.assessmentCenterId,
					deletedAt: null,
				},
				select: { id: true },
			});

			if (!participant) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Teilnehmer nicht gefunden",
				});
			}

			// Enforce one group per participant per AC by removing any existing membership
			const existingMembership =
				await ctx.db.participantGroupMembership.findFirst({
					where: {
						participantId: input.participantId,
						group: { assessmentCenterId: group.assessmentCenterId },
					},
					select: { id: true },
				});

			if (existingMembership) {
				await ctx.db.participantGroupMembership.delete({
					where: { id: existingMembership.id },
				});
			}

			await ctx.db.participantGroupMembership.create({
				data: {
					groupId: input.groupId,
					participantId: input.participantId,
				},
			});
		}),

	unassignParticipant: protectedProcedure
		.input(
			z.object({
				groupId: z.string(),
				participantId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Teilnehmer entfernen",
				});
			}

			const group = await ctx.db.participantGroup.findUnique({
				where: { id: input.groupId },
				select: {
					assessmentCenterId: true,
					assessmentCenter: { select: { status: true } },
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Gruppe nicht gefunden",
				});
			}

			if (group.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Einrichtung kann nach Aktivierung nicht mehr geändert werden",
				});
			}

			// Verify the participant belongs to the same AC
			const participant = await ctx.db.participant.findFirst({
				where: {
					id: input.participantId,
					assessmentCenterId: group.assessmentCenterId,
					deletedAt: null,
				},
				select: { id: true },
			});

			if (!participant) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Teilnehmer nicht gefunden",
				});
			}

			await ctx.db.participantGroupMembership.delete({
				where: {
					participantId_groupId: {
						participantId: input.participantId,
						groupId: input.groupId,
					},
				},
			});
		}),
});
