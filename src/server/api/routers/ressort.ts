import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCapacityError } from "@/lib/ressort-capacity";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import type { db } from "@/server/db";

const ressortName = z
	.string()
	.trim()
	.min(1, "Name ist erforderlich")
	.max(80, "Höchstens 80 Zeichen");

const capacityInput = z.object({
	acId: z.string(),
	ressortId: z.string(),
	// Checked by getCapacityError, shared with the form.
	registered: z.number(),
	active: z.number(),
	toAdmit: z.number(),
});

type Db = typeof db;

async function assertNameFree(db: Db, name: string, exceptId?: string) {
	const existing = await db.ressort.findFirst({
		where: {
			name: { equals: name, mode: "insensitive" },
			...(exceptId ? { id: { not: exceptId } } : {}),
		},
		select: { id: true },
	});
	if (existing) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Ein Ressort „${name}“ gibt es schon`,
		});
	}
}

async function findRessort(db: Db, id: string) {
	const ressort = await db.ressort.findUnique({
		where: { id },
		select: { id: true, _count: { select: { capacities: true } } },
	});
	if (!ressort) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Ressort nicht gefunden",
		});
	}
	return ressort;
}

/**
 * Ressorts are shared by all ACs; their planned numbers belong to one AC.
 * Only admins change either.
 */
export const ressortRouter = createTRPCRouter({
	list: adminProcedure.query(({ ctx }) =>
		ctx.db.ressort.findMany({
			select: {
				id: true,
				name: true,
				_count: { select: { capacities: true } },
			},
			orderBy: { name: "asc" },
		}),
	),

	create: adminProcedure
		.input(z.object({ name: ressortName }))
		.mutation(async ({ ctx, input }) => {
			await assertNameFree(ctx.db, input.name);
			return ctx.db.ressort.create({
				data: { name: input.name },
				select: { id: true, name: true },
			});
		}),

	rename: adminProcedure
		.input(z.object({ id: z.string(), name: ressortName }))
		.mutation(async ({ ctx, input }) => {
			await findRessort(ctx.db, input.id);
			await assertNameFree(ctx.db, input.name, input.id);
			return ctx.db.ressort.update({
				where: { id: input.id },
				data: { name: input.name },
				select: { id: true, name: true },
			});
		}),

	remove: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const ressort = await findRessort(ctx.db, input.id);
			// Planned numbers would be lost: a used ressort stays.
			if (ressort._count.capacities > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Dieses Ressort hat schon Zahlen in einem Assessment Center und kann nicht gelöscht werden",
				});
			}
			await ctx.db.ressort.delete({ where: { id: input.id } });
			return { id: input.id };
		}),

	setCapacity: adminProcedure
		.input(capacityInput)
		.mutation(async ({ ctx, input }) => {
			const { acId, ressortId, ...capacity } = input;
			const error = getCapacityError(capacity);
			if (error) {
				throw new TRPCError({ code: "BAD_REQUEST", message: error });
			}

			const ac = await ctx.db.assessmentCenter.findFirst({
				where: { id: acId, deletedAt: null },
				select: { id: true },
			});
			if (!ac) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assessment Center nicht gefunden",
				});
			}
			await findRessort(ctx.db, ressortId);

			return ctx.db.acRessortCapacity.upsert({
				where: {
					assessmentCenterId_ressortId: {
						assessmentCenterId: acId,
						ressortId,
					},
				},
				create: { assessmentCenterId: acId, ressortId, ...capacity },
				update: capacity,
				select: {
					ressortId: true,
					registered: true,
					active: true,
					toAdmit: true,
				},
			});
		}),
});
