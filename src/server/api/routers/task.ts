import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const DRAFT_ONLY_MSG =
	"Einrichtung kann nach Aktivierung nicht mehr geändert werden";
const criteriaTypeSchema = z.enum(["QUANTITATIVE", "QUALITATIVE"]);
const criteriaGroupFactorTypeSchema = z.enum(["POTENTIAL", "COMPETENCE"]);

function assertCriteriaWeight(
	type: z.infer<typeof criteriaTypeSchema>,
	weight: number | undefined,
) {
	if (type === "QUANTITATIVE" && weight === undefined) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Quantitative Kriterien benötigen eine Gewichtung",
		});
	}
}

export const taskRouter = createTRPCRouter({
	listByAc: protectedProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.task.findMany({
				where: { assessmentCenterId: input.acId, deletedAt: null },
				select: {
					id: true,
					name: true,
					description: true,
					isTeamTask: true,
					_count: {
						select: { criteria: { where: { deletedAt: null } } },
					},
				},
				orderBy: { createdAt: "asc" },
			});
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.query(async ({ ctx, input }) => {
			const task = await ctx.db.task.findFirst({
				where: {
					id: input.id,
					assessmentCenterId: input.acId,
					deletedAt: null,
				},
				select: {
					id: true,
					name: true,
					description: true,
					isTeamTask: true,
					criteriaGroups: {
						where: { deletedAt: null },
						select: {
							id: true,
							title: true,
							factorType: true,
							criteria: {
								where: { deletedAt: null },
								select: {
									id: true,
									criteriaGroupId: true,
									name: true,
									description: true,
									type: true,
									weight: true,
								},
								orderBy: { createdAt: "asc" },
							},
						},
						orderBy: { createdAt: "asc" },
					},
				},
			});

			if (!task) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Aufgabe nicht gefunden",
				});
			}

			return task;
		}),

	create: protectedProcedure
		.input(
			z.object({
				acId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				isTeamTask: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Aufgaben erstellen",
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

			return ctx.db.task.create({
				data: {
					assessmentCenterId: input.acId,
					name: input.name,
					description: input.description ?? null,
					isTeamTask: input.isTeamTask,
				},
				select: { id: true, name: true, description: true, isTeamTask: true },
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				acId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				isTeamTask: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Aufgaben bearbeiten",
				});
			}

			const task = await ctx.db.task.findFirst({
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

			if (!task) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Aufgabe nicht gefunden",
				});
			}

			if (task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			return ctx.db.task.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: input.description ?? null,
					isTeamTask: input.isTeamTask,
				},
				select: { id: true, name: true, description: true, isTeamTask: true },
			});
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Aufgaben löschen",
				});
			}

			const task = await ctx.db.task.findFirst({
				where: {
					id: input.id,
					assessmentCenterId: input.acId,
					deletedAt: null,
				},
				select: {
					id: true,
					assessmentCenter: { select: { status: true } },
					_count: { select: { scheduleEntries: true } },
				},
			});

			if (!task) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Aufgabe nicht gefunden",
				});
			}

			if (task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			if (task._count.scheduleEntries > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Aufgabe ist im Zeitplan eingetragen und kann nicht gelöscht werden",
				});
			}

			await ctx.db.reviewerAssignment.deleteMany({
				where: { taskId: input.id },
			});

			await ctx.db.reviewCriteria.updateMany({
				where: { taskId: input.id, deletedAt: null },
				data: { deletedAt: new Date() },
			});
			await ctx.db.reviewCriteriaGroup.updateMany({
				where: { taskId: input.id, deletedAt: null },
				data: { deletedAt: new Date() },
			});

			await ctx.db.task.update({
				where: { id: input.id },
				data: { deletedAt: new Date() },
			});
		}),

	addCriteriaGroup: protectedProcedure
		.input(
			z.object({
				taskId: z.string(),
				acId: z.string(),
				title: z.string().trim().min(1, "Titel ist erforderlich"),
				factorType: criteriaGroupFactorTypeSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Kriteriengruppen hinzufügen",
				});
			}

			const task = await ctx.db.task.findFirst({
				where: {
					id: input.taskId,
					assessmentCenterId: input.acId,
					deletedAt: null,
				},
				select: {
					id: true,
					assessmentCenter: { select: { status: true } },
				},
			});

			if (!task) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Aufgabe nicht gefunden",
				});
			}

			if (task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			return ctx.db.reviewCriteriaGroup.create({
				data: {
					taskId: input.taskId,
					title: input.title,
					factorType: input.factorType,
				},
				select: {
					id: true,
					title: true,
					factorType: true,
				},
			});
		}),

	updateCriteriaGroup: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				taskId: z.string(),
				acId: z.string(),
				title: z.string().trim().min(1, "Titel ist erforderlich"),
				factorType: criteriaGroupFactorTypeSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Kriteriengruppen bearbeiten",
				});
			}

			const group = await ctx.db.reviewCriteriaGroup.findFirst({
				where: {
					id: input.id,
					taskId: input.taskId,
					deletedAt: null,
					task: { assessmentCenterId: input.acId },
				},
				select: {
					id: true,
					task: {
						select: { assessmentCenter: { select: { status: true } } },
					},
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kriteriengruppe nicht gefunden",
				});
			}

			if (group.task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			return ctx.db.reviewCriteriaGroup.update({
				where: { id: input.id },
				data: {
					title: input.title,
					factorType: input.factorType,
				},
				select: {
					id: true,
					title: true,
					factorType: true,
				},
			});
		}),

	removeCriteriaGroup: protectedProcedure
		.input(z.object({ id: z.string(), taskId: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Kriteriengruppen entfernen",
				});
			}

			const group = await ctx.db.reviewCriteriaGroup.findFirst({
				where: {
					id: input.id,
					taskId: input.taskId,
					deletedAt: null,
					task: { assessmentCenterId: input.acId },
				},
				select: {
					id: true,
					task: {
						select: { assessmentCenter: { select: { status: true } } },
					},
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kriteriengruppe nicht gefunden",
				});
			}

			if (group.task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			const deletedAt = new Date();

			await ctx.db.reviewCriteria.updateMany({
				where: { criteriaGroupId: input.id, deletedAt: null },
				data: { deletedAt },
			});
			await ctx.db.reviewCriteriaGroup.update({
				where: { id: input.id },
				data: { deletedAt },
			});
		}),

	addCriteria: protectedProcedure
		.input(
			z.object({
				taskId: z.string(),
				acId: z.string(),
				criteriaGroupId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				type: criteriaTypeSchema,
				weight: z.number().positive().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Kriterien hinzufügen",
				});
			}

			assertCriteriaWeight(input.type, input.weight);

			const group = await ctx.db.reviewCriteriaGroup.findFirst({
				where: {
					id: input.criteriaGroupId,
					taskId: input.taskId,
					deletedAt: null,
					task: { assessmentCenterId: input.acId },
				},
				select: {
					id: true,
					task: {
						select: {
							assessmentCenter: { select: { status: true } },
						},
					},
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kriteriengruppe nicht gefunden",
				});
			}

			if (group.task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			return ctx.db.reviewCriteria.create({
				data: {
					taskId: input.taskId,
					criteriaGroupId: input.criteriaGroupId,
					name: input.name,
					description: input.description ?? null,
					type: input.type,
					weight: input.type === "QUANTITATIVE" ? (input.weight ?? null) : null,
				},
				select: {
					id: true,
					criteriaGroupId: true,
					name: true,
					description: true,
					type: true,
					weight: true,
				},
			});
		}),

	updateCriteria: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				taskId: z.string(),
				acId: z.string(),
				criteriaGroupId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				type: criteriaTypeSchema,
				weight: z.number().positive().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Kriterien bearbeiten",
				});
			}

			assertCriteriaWeight(input.type, input.weight);

			const criteria = await ctx.db.reviewCriteria.findFirst({
				where: {
					id: input.id,
					taskId: input.taskId,
					deletedAt: null,
					task: { assessmentCenterId: input.acId },
				},
				select: {
					id: true,
					task: {
						select: { assessmentCenter: { select: { status: true } } },
					},
				},
			});

			if (!criteria) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kriterium nicht gefunden",
				});
			}

			if (criteria.task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			const group = await ctx.db.reviewCriteriaGroup.findFirst({
				where: {
					id: input.criteriaGroupId,
					taskId: input.taskId,
					deletedAt: null,
					task: { assessmentCenterId: input.acId },
				},
				select: { id: true },
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kriteriengruppe nicht gefunden",
				});
			}

			return ctx.db.reviewCriteria.update({
				where: { id: input.id },
				data: {
					criteriaGroupId: input.criteriaGroupId,
					name: input.name,
					description: input.description ?? null,
					type: input.type,
					weight: input.type === "QUANTITATIVE" ? (input.weight ?? null) : null,
				},
				select: {
					id: true,
					criteriaGroupId: true,
					name: true,
					description: true,
					type: true,
					weight: true,
				},
			});
		}),

	removeCriteria: protectedProcedure
		.input(z.object({ id: z.string(), taskId: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Nur Admins können Kriterien entfernen",
				});
			}

			const criteria = await ctx.db.reviewCriteria.findFirst({
				where: {
					id: input.id,
					taskId: input.taskId,
					deletedAt: null,
					task: { assessmentCenterId: input.acId },
				},
				select: {
					id: true,
					task: {
						select: { assessmentCenter: { select: { status: true } } },
					},
				},
			});

			if (!criteria) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kriterium nicht gefunden",
				});
			}

			if (criteria.task.assessmentCenter.status !== "DRAFT") {
				throw new TRPCError({ code: "FORBIDDEN", message: DRAFT_ONLY_MSG });
			}

			await ctx.db.reviewCriteria.update({
				where: { id: input.id },
				data: { deletedAt: new Date() },
			});
		}),
});
