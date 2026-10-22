import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSlotStatus } from "@/lib/ressort-assignment";
import { getCapacityError } from "@/lib/ressort-capacity";
import { getResultsAccess } from "@/lib/results-access";
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

/** What makes a ressort "used" and therefore not deletable. */
const USAGE_COUNTS = { capacities: true, participants: true } as const;

/** Numbers in an AC or assigned people would be lost by deleting it. */
function isRessortUsed(counts: { capacities: number; participants: number }) {
	return counts.capacities > 0 || counts.participants > 0;
}

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
		select: { id: true, name: true, _count: { select: USAGE_COUNTS } },
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
 * An AC whose results tab admins may change: not deleted and completed or
 * anonymized (see getResultsAccess). Ressort numbers and assignments live
 * there, so they follow its rules.
 */
async function findManageableAc(db: Db, acId: string) {
	const ac = await db.assessmentCenter.findFirst({
		where: { id: acId, deletedAt: null },
		select: { status: true },
	});
	if (!ac) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Assessment Center nicht gefunden",
		});
	}
	if (!getResultsAccess("ADMIN", ac.status).canManage) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Ressorts gibt es erst ab dem abgeschlossenen AC",
		});
	}
}

/** Where the ressort stands in one AC after an assignment, for the warning. */
async function getAcSlotStatus(db: Db, acId: string, ressortId: string) {
	const [assigned, capacity] = await Promise.all([
		db.participant.count({
			where: { assessmentCenterId: acId, ressortId, deletedAt: null },
		}),
		db.acRessortCapacity.findUnique({
			where: {
				assessmentCenterId_ressortId: { assessmentCenterId: acId, ressortId },
			},
			select: { toAdmit: true },
		}),
	]);
	return getSlotStatus(capacity?.toAdmit ?? null, assigned);
}

/**
 * Ressorts are shared by all ACs; their planned numbers belong to one AC.
 * Only admins change either.
 */
export const ressortRouter = createTRPCRouter({
	list: adminProcedure.query(async ({ ctx }) => {
		const ressorts = await ctx.db.ressort.findMany({
			select: {
				id: true,
				name: true,
				_count: { select: USAGE_COUNTS },
			},
			orderBy: { name: "asc" },
		});
		return ressorts.map(({ _count, ...ressort }) => ({
			...ressort,
			isUsed: isRessortUsed(_count),
		}));
	}),

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
			if (isRessortUsed(ressort._count)) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Dieses Ressort wird schon in einem Assessment Center verwendet und kann nicht gelöscht werden",
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

			await findManageableAc(ctx.db, acId);
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

	/**
	 * Assigns a person to a ressort, moves them to another one, or removes the
	 * assignment (ressortId null). Going beyond the target is allowed; the
	 * returned status lets the caller warn.
	 */
	assign: adminProcedure
		.input(
			z.object({
				acId: z.string(),
				participantId: z.string(),
				// null removes the assignment; an empty id is no ressort.
				ressortId: z.string().min(1).nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await findManageableAc(ctx.db, input.acId);
			const ressort = input.ressortId
				? await findRessort(ctx.db, input.ressortId)
				: null;

			const { count } = await ctx.db.participant.updateMany({
				where: {
					id: input.participantId,
					assessmentCenterId: input.acId,
					deletedAt: null,
				},
				data: { ressortId: input.ressortId },
			});
			if (count === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Bewerbende nicht gefunden",
				});
			}

			if (!ressort) {
				return { ressort: null };
			}
			return {
				ressort: {
					name: ressort.name,
					...(await getAcSlotStatus(ctx.db, input.acId, ressort.id)),
				},
			};
		}),
});
