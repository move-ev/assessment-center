import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { RATING_ANCHOR_MAX_LENGTH } from "@/lib/rating-anchors";
import { assertAcEditable } from "@/server/api/ac-lock";
import { assertNoSubmittedRatings } from "@/server/api/rating-guard";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const criteriaTypeSchema = z.enum(["QUANTITATIVE", "QUALITATIVE"]);
/** Anchor text under the rating scale; blank means no anchor. */
const anchorTextSchema = z.string().trim().max(RATING_ANCHOR_MAX_LENGTH);

function toAnchorText(
	type: z.infer<typeof criteriaTypeSchema>,
	text: string | undefined,
): string | null {
	return type === "QUANTITATIVE" && text ? text : null;
}

/** Weight of a task in the overall score; mirrors the DB check constraint. */
const scoreWeightSchema = z.number().positive("Gewicht muss größer als 0 sein");

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
	listByAc: adminProcedure
		.input(z.object({ acId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.task.findMany({
				where: { assessmentCenterId: input.acId, deletedAt: null },
				select: {
					id: true,
					name: true,
					description: true,
					isTeamTask: true,
					scoreWeight: true,
					_count: {
						select: { criteria: { where: { deletedAt: null } } },
					},
				},
				orderBy: { createdAt: "asc" },
			});
		}),

	getById: adminProcedure
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
					instructions: true,
					isTeamTask: true,
					scoreWeight: true,
					criteriaGroups: {
						where: { deletedAt: null },
						select: {
							id: true,
							title: true,
							criteria: {
								where: { deletedAt: null },
								select: {
									id: true,
									criteriaGroupId: true,
									name: true,
									description: true,
									type: true,
									weight: true,
									isOptional: true,
									anchorStar2: true,
									anchorStar4: true,
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

	create: adminProcedure
		.input(
			z.object({
				acId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				isTeamTask: z.boolean().default(false),
				scoreWeight: scoreWeightSchema.default(1),
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

			return ctx.db.task.create({
				data: {
					assessmentCenterId: input.acId,
					name: input.name,
					description: input.description ?? null,
					isTeamTask: input.isTeamTask,
					scoreWeight: input.scoreWeight,
				},
				select: {
					id: true,
					name: true,
					description: true,
					isTeamTask: true,
					scoreWeight: true,
				},
			});
		}),

	update: adminProcedure
		.input(
			z.object({
				id: z.string(),
				acId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				instructions: z.string().trim().optional(),
				isTeamTask: z.boolean(),
				scoreWeight: scoreWeightSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(task.assessmentCenter.status);

			return ctx.db.task.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: input.description ?? null,
					instructions: input.instructions ?? null,
					isTeamTask: input.isTeamTask,
					scoreWeight: input.scoreWeight,
				},
				select: {
					id: true,
					name: true,
					description: true,
					instructions: true,
					isTeamTask: true,
					scoreWeight: true,
				},
			});
		}),

	remove: adminProcedure
		.input(z.object({ id: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(task.assessmentCenter.status);

			if (task._count.scheduleEntries > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Aufgabe ist im Zeitplan eingetragen und kann nicht gelöscht werden",
				});
			}

			await assertNoSubmittedRatings(
				{ taskId: input.id },
				"Zu dieser Aufgabe liegen bereits Bewertungen vor; sie kann nicht gelöscht werden",
			);

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

	addCriteriaGroup: adminProcedure
		.input(
			z.object({
				taskId: z.string(),
				acId: z.string(),
				title: z.string().trim().min(1, "Titel ist erforderlich"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(task.assessmentCenter.status);

			return ctx.db.reviewCriteriaGroup.create({
				data: { taskId: input.taskId, title: input.title },
				select: { id: true, title: true },
			});
		}),

	updateCriteriaGroup: adminProcedure
		.input(
			z.object({
				id: z.string(),
				taskId: z.string(),
				acId: z.string(),
				title: z.string().trim().min(1, "Titel ist erforderlich"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(group.task.assessmentCenter.status);

			return ctx.db.reviewCriteriaGroup.update({
				where: { id: input.id },
				data: { title: input.title },
				select: { id: true, title: true },
			});
		}),

	removeCriteriaGroup: adminProcedure
		.input(z.object({ id: z.string(), taskId: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(group.task.assessmentCenter.status);

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

	addCriteria: adminProcedure
		.input(
			z.object({
				taskId: z.string(),
				acId: z.string(),
				criteriaGroupId: z.string(),
				name: z.string().trim().min(1, "Name ist erforderlich"),
				description: z.string().trim().optional(),
				type: criteriaTypeSchema,
				weight: z.number().positive().optional(),
				isOptional: z.boolean().default(false),
				anchorStar2: anchorTextSchema.optional(),
				anchorStar4: anchorTextSchema.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(group.task.assessmentCenter.status);

			return ctx.db.reviewCriteria.create({
				data: {
					taskId: input.taskId,
					criteriaGroupId: input.criteriaGroupId,
					name: input.name,
					description: input.description ?? null,
					type: input.type,
					weight: input.type === "QUANTITATIVE" ? (input.weight ?? null) : null,
					isOptional: input.type === "QUANTITATIVE" && input.isOptional,
					anchorStar2: toAnchorText(input.type, input.anchorStar2),
					anchorStar4: toAnchorText(input.type, input.anchorStar4),
				},
				select: {
					id: true,
					criteriaGroupId: true,
					name: true,
					description: true,
					type: true,
					weight: true,
					isOptional: true,
					anchorStar2: true,
					anchorStar4: true,
				},
			});
		}),

	updateCriteria: adminProcedure
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
				isOptional: z.boolean(),
				anchorStar2: anchorTextSchema,
				anchorStar4: anchorTextSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(criteria.task.assessmentCenter.status);

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
					isOptional: input.type === "QUANTITATIVE" && input.isOptional,
					anchorStar2: toAnchorText(input.type, input.anchorStar2),
					anchorStar4: toAnchorText(input.type, input.anchorStar4),
				},
				select: {
					id: true,
					criteriaGroupId: true,
					name: true,
					description: true,
					type: true,
					weight: true,
					isOptional: true,
					anchorStar2: true,
					anchorStar4: true,
				},
			});
		}),

	removeCriteria: adminProcedure
		.input(z.object({ id: z.string(), taskId: z.string(), acId: z.string() }))
		.mutation(async ({ ctx, input }) => {
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

			assertAcEditable(criteria.task.assessmentCenter.status);

			await ctx.db.reviewCriteria.update({
				where: { id: input.id },
				data: { deletedAt: new Date() },
			});
		}),
});
