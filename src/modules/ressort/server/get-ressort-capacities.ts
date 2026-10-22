import "server-only";

import {
	getSlotStatus,
	groupByRessort,
	type SlotStatus,
} from "@/lib/ressort-assignment";
import type { RessortCapacity } from "@/lib/ressort-capacity";
import { db } from "@/server/db";

type AssignedPerson = { id: string; name: string; ressortId: string | null };

export type RessortCapacityRow = {
	ressortId: string;
	name: string;
	/** Null until an admin enters numbers for this AC. */
	capacity: RessortCapacity | null;
	/** People of this AC assigned to the ressort, by name. */
	people: AssignedPerson[];
	/** Against the target; overBy and label warn when it is exceeded. */
	slots: SlotStatus;
};

/** Every ressort with its planned numbers and assigned people in one AC. */
export async function getRessortCapacities(
	acId: string,
): Promise<RessortCapacityRow[]> {
	const [ressorts, assigned] = await Promise.all([
		db.ressort.findMany({
			select: {
				id: true,
				name: true,
				capacities: {
					where: { assessmentCenterId: acId },
					select: { registered: true, active: true, toAdmit: true },
				},
			},
			orderBy: { name: "asc" },
		}),
		db.participant.findMany({
			where: {
				assessmentCenterId: acId,
				deletedAt: null,
				ressortId: { not: null },
			},
			select: { id: true, name: true, ressortId: true },
			orderBy: { name: "asc" },
		}),
	]);
	const peopleByRessort = groupByRessort(assigned);

	return ressorts.map((ressort) => {
		const capacity = ressort.capacities[0] ?? null;
		const people = peopleByRessort.get(ressort.id) ?? [];
		return {
			ressortId: ressort.id,
			name: ressort.name,
			capacity,
			people,
			slots: getSlotStatus(capacity?.toAdmit ?? null, people.length),
		};
	});
}
