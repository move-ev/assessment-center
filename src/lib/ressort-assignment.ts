import { getFreeSlots } from "./ressort-capacity.ts";

/** The ressort a person is assigned to, as shown next to them. */
export type AssignedRessort = { id: string; name: string };

/**
 * People per ressort, keeping their order; unassigned people (null) are left
 * out. A group's length is the ressort's "zugeteilt".
 */
export function groupByRessort<T extends { ressortId: string | null }>(
	people: T[],
): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const person of people) {
		if (person.ressortId !== null) {
			groups.set(person.ressortId, [
				...(groups.get(person.ressortId) ?? []),
				person,
			]);
		}
	}
	return groups;
}

/** Best rank first; people without a rank (no score) come last. */
export function sortByRank<T extends { id: string }>(
	people: T[],
	ranks: Record<string, number | null>,
): T[] {
	const rankOf = (person: T) => ranks[person.id] ?? Number.POSITIVE_INFINITY;
	return [...people].sort((a, b) => rankOf(a) - rankOf(b));
}

export type SlotStatus = {
	/** Null when no numbers were entered for the ressort in this AC. */
	freeSlots: number | null;
	/** People assigned beyond the target; 0 within it. */
	overBy: number;
	/** "noch 3 frei", "voll" or "2 über dem Ziel"; null without a target. */
	label: string | null;
};

/**
 * Where a ressort stands against its target. Assigning beyond the target is
 * allowed; overBy and the label make it visible.
 */
export function getSlotStatus(
	toAdmit: number | null,
	assigned: number,
): SlotStatus {
	if (toAdmit === null) {
		return { freeSlots: null, overBy: 0, label: null };
	}
	const freeSlots = getFreeSlots(toAdmit, assigned);
	if (freeSlots > 0) {
		return { freeSlots, overBy: 0, label: `noch ${freeSlots} frei` };
	}
	if (freeSlots === 0) {
		return { freeSlots, overBy: 0, label: "voll" };
	}
	return {
		freeSlots,
		overBy: -freeSlots,
		label: `${-freeSlots} über dem Ziel`,
	};
}

/** URL value of the ranking filter for people without a ressort. */
export const UNASSIGNED_FILTER_VALUE = "none";

export type RessortFilter =
	| { kind: "all" }
	| { kind: "none" }
	| { kind: "ressort"; ressortId: string };

/** Reads the ranking filter from its URL value (`?ressort=`). */
export function parseRessortFilter(value: string | undefined): RessortFilter {
	if (!value) return { kind: "all" };
	if (value === UNASSIGNED_FILTER_VALUE) return { kind: "none" };
	return { kind: "ressort", ressortId: value };
}

/** The `?ressort=` value of a filter; empty for everyone. */
export function toRessortFilterValue(filter: RessortFilter): string {
	switch (filter.kind) {
		case "all":
			return "";
		case "none":
			return UNASSIGNED_FILTER_VALUE;
		case "ressort":
			return filter.ressortId;
	}
}

export function matchesRessortFilter(
	ressortId: string | null,
	filter: RessortFilter,
): boolean {
	switch (filter.kind) {
		case "all":
			return true;
		case "none":
			return ressortId === null;
		case "ressort":
			return ressortId === filter.ressortId;
	}
}
