/** Planned numbers of one ressort for one AC (one application phase). */
export type RessortCapacity = {
	/** Members currently registered in the ressort. */
	registered: number;
	/** Of those, members who actually work in it. */
	active: number;
	/** People to admit to the ressort from this AC. */
	toAdmit: number;
};

/** Upper bound so a typo cannot overflow the database's integer column. */
export const CAPACITY_MAX = 9999;

/**
 * Why a ressort's numbers can't be saved, or null if they can: whole
 * numbers from 0 to CAPACITY_MAX, and no more active members than
 * registered ones.
 */
export function getCapacityError(capacity: RessortCapacity): string | null {
	const values = [capacity.registered, capacity.active, capacity.toAdmit];
	const isValid = (value: number) =>
		Number.isInteger(value) && value >= 0 && value <= CAPACITY_MAX;
	if (!values.every(isValid)) {
		return `Nur ganze Zahlen von 0 bis ${CAPACITY_MAX}.`;
	}
	if (capacity.active > capacity.registered) {
		return "Aktiv kann nicht größer sein als gemeldet.";
	}
	return null;
}

/**
 * Places still open in a ressort: those to admit minus those already
 * assigned. Negative means more are assigned than planned, which is allowed.
 */
export function getFreeSlots(toAdmit: number, assigned: number): number {
	return toAdmit - assigned;
}
