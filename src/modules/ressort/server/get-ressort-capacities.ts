import "server-only";

import { getFreeSlots, type RessortCapacity } from "@/lib/ressort-capacity";
import { db } from "@/server/db";

export type RessortCapacityRow = {
	ressortId: string;
	name: string;
	/** Null until an admin enters numbers for this AC. */
	capacity: RessortCapacity | null;
	assigned: number;
	/** Negative when more are assigned than should be admitted. */
	freeSlots: number | null;
};

/** Every ressort with its planned numbers in one AC. */
export async function getRessortCapacities(
	acId: string,
): Promise<RessortCapacityRow[]> {
	const ressorts = await db.ressort.findMany({
		select: {
			id: true,
			name: true,
			capacities: {
				where: { assessmentCenterId: acId },
				select: { registered: true, active: true, toAdmit: true },
			},
		},
		orderBy: { name: "asc" },
	});

	return ressorts.map((ressort) => {
		const capacity = ressort.capacities[0] ?? null;
		// Applicants are assigned to ressorts in #46; until then nobody is.
		const assigned = 0;
		return {
			ressortId: ressort.id,
			name: ressort.name,
			capacity,
			assigned,
			freeSlots: capacity ? getFreeSlots(capacity.toAdmit, assigned) : null,
		};
	});
}
