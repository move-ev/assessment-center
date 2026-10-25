/**
 * Seeds a completed test AC with ratings for the calibration tab, so the
 * reviewer effects and hypothetical results can be checked in dev.
 *
 *   bun scripts/seed-calibration-test-ac.ts           # dry run
 *   bun scripts/seed-calibration-test-ac.ts --apply   # writes to DATABASE_URL
 *
 * Every reviewer has a known leniency in stars (TRUE_LENIENCY), so the
 * estimated effects can be compared with it. Built in on purpose:
 * - some people are seen mostly by strict or mostly by mild reviewers,
 *   so their hypothetical rank moves;
 * - "Selten Vergleich" shares a single rating (shrinkage),
 *   "Allein Bewertend" never shares one (no effect);
 * - one person rated by a single reviewer per task, one with no ratings.
 * Test reviewers are fake users (@kalibrierung.test) that cannot sign in.
 * --apply refuses to run against a database that looks like production
 * (more than a handful of users) and replaces an earlier test AC.
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";

const AC_NAME = "Test-AC Kalibrierung";
const APPLY = process.argv.includes("--apply");
const SCALE_MAX = 6;

const db = new PrismaClient({
	adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

// Deterministic, so every run gives the same data.
let seed = 42;
function random(): number {
	seed = (seed * 1664525 + 1013904223) % 2 ** 32;
	return seed / 2 ** 32;
}
function noise(): number {
	return (random() + random() + random() - 1.5) * 0.8;
}
let idCounter = 0;
function id(prefix: string): string {
	idCounter += 1;
	return `test${prefix}${idCounter.toString().padStart(5, "0")}`;
}

/** Stars above (+) or below (−) a neutral reviewer. */
const TRUE_LENIENCY: Record<string, number> = {
	"Streng Stefanie": -1.2,
	"Kritisch Konrad": -0.8,
	"Genau Greta": -0.5,
	"Neutral Nora": 0,
	"Mittig Malte": 0,
	"Sachlich Sven": 0.1,
	"Freundlich Fiona": 0.5,
	"Wohlwollend Willi": 0.8,
	"Mild Mia": 1.2,
	"Selten Vergleich": 1.5,
	"Allein Bewertend": -1,
};
const STRICT = ["Streng Stefanie", "Kritisch Konrad", "Genau Greta"];
const MILD = ["Mild Mia", "Wohlwollend Willi", "Freundlich Fiona"];
const NEUTRAL = ["Neutral Nora", "Mittig Malte", "Sachlich Sven"];

const TASKS = [
	{
		key: "SP",
		name: "Selbstpräsentation",
		isTeamTask: false,
		scoreWeight: 0.5,
		criteria: [
			{ name: "Struktur", weight: 1 },
			{ name: "Auftreten", weight: 1 },
			{ name: "Motivation", weight: 1.5 },
		],
	},
	{
		key: "GC",
		name: "Gruppencase",
		isTeamTask: true,
		scoreWeight: 1,
		criteria: [
			{ name: "Teamfähigkeit", weight: 1.5 },
			{ name: "Analytisches Denken", weight: 1.5 },
			{ name: "Strukturierung", weight: 1 },
		],
	},
	{
		key: "IV",
		name: "Einzelinterview",
		isTeamTask: false,
		scoreWeight: 1,
		criteria: [
			{ name: "Verantwortung", weight: 1.5 },
			{ name: "Konfliktfähigkeit", weight: 1 },
			{ name: "Passung", weight: 1 },
		],
	},
] as const;

const FIRST = ["Anna", "Ben", "Clara", "David", "Emma", "Felix", "Greta", "Hannes", "Ida", "Jonas", "Klara", "Lukas", "Mila", "Noah", "Olivia", "Paul", "Quirin", "Romy", "Simon", "Theresa", "Ulrich", "Vera", "Wim", "Xenia", "Yannick", "Zoe", "Anton", "Bea", "Carl", "Dana"];
const LAST = ["Abel", "Brandt", "Conrad", "Dietz", "Ebert", "Fuchs", "Graf", "Hahn", "Iske", "Jung", "Kraus", "Lang", "Maier", "Neumann", "Otto", "Peters", "Quast", "Roth", "Sauer", "Thiel", "Ulmer", "Vogt", "Wolf", "Xander", "Yilmaz", "Zimmer", "Arndt", "Busch", "Claus", "Dorn"];

type Person = { name: string; ability: number; panel: "strict" | "mild" | "mixed" };

/** Ability in stars around the middle of the scale. */
const PEOPLE: Person[] = FIRST.map((first, index) => ({
	name: `${first} ${LAST[index]}`,
	ability: 3.6 + ((index * 7) % 30) / 30 * 1.8 - 0.9,
	// Every fifth person sees mostly strict, every fifth+2 mostly mild reviewers.
	panel: index % 5 === 0 ? "strict" : index % 5 === 2 ? "mild" : "mixed",
}));
const SINGLE_REVIEWER = "Einzel Bewertet";
const NO_RATINGS = "Ohne Bewertung";

function pick<T>(items: readonly T[]): T {
	return items[Math.floor(random() * items.length)] as T;
}

function panelFor(person: Person, taskIndex: number): string[] {
	const pool =
		person.panel === "strict"
			? STRICT
			: person.panel === "mild"
				? MILD
				: [...STRICT, ...MILD, ...NEUTRAL];
	const first = pick(pool);
	let second = pick(pool);
	while (second === first) second = pick(pool);
	const panel = [first, second];
	// A third reviewer now and then.
	if (person.panel === "mixed" && taskIndex === 1 && random() < 0.3) {
		let third = pick(NEUTRAL);
		while (panel.includes(third)) third = pick(NEUTRAL);
		panel.push(third);
	}
	return panel;
}

function stars(ability: number, reviewer: string): number {
	const value = Math.round(ability + (TRUE_LENIENCY[reviewer] ?? 0) + noise());
	return Math.min(SCALE_MAX, Math.max(1, value));
}

async function main() {
	const users = await db.user.count();
	if (APPLY && users > 15) {
		throw new Error(
			`${users} users: this looks like production, refusing to seed test data`,
		);
	}

	const plan: Array<{ person: string; task: string; reviewers: string[] }> = [];
	PEOPLE.forEach((person, index) => {
		TASKS.forEach((task, taskIndex) => {
			const reviewers = panelFor(person, taskIndex);
			// "Selten Vergleich" joins exactly one shared rating.
			if (index === 3 && task.key === "IV") reviewers.push("Selten Vergleich");
			plan.push({ person: person.name, task: task.key, reviewers });
		});
	});
	for (const task of TASKS) {
		plan.push({ person: SINGLE_REVIEWER, task: task.key, reviewers: ["Allein Bewertend"] });
		plan.push({ person: NO_RATINGS, task: task.key, reviewers: [] });
	}

	const reviewerNames = Object.keys(TRUE_LENIENCY);
	console.log(`AC "${AC_NAME}": ${PEOPLE.length + 2} participants, ${reviewerNames.length} reviewers, ${plan.reduce((sum, entry) => sum + entry.reviewers.length, 0)} rated assignments`);
	if (!APPLY) {
		console.log("Dry run. Pass --apply to write.");
		return;
	}

	const existing = await db.assessmentCenter.findMany({ where: { name: AC_NAME } });
	for (const ac of existing) {
		await db.assessmentCenter.delete({ where: { id: ac.id } });
		console.log(`Deleted earlier test AC ${ac.id}`);
	}

	const userIds = new Map<string, string>();
	for (const name of reviewerNames) {
		const email = `${name.toLowerCase().replace(/\s+/g, ".")}@kalibrierung.test`;
		const user = await db.user.upsert({
			where: { email },
			update: { name },
			create: { id: id("u"), name, email, emailVerified: true },
		});
		userIds.set(name, user.id);
	}

	const acId = id("ac");
	await db.assessmentCenter.create({
		data: {
			id: acId,
			name: AC_NAME,
			description: "Testdaten mit bekannter Strenge je Bewerter.",
			status: "COMPLETED",
			ratingScaleMax: SCALE_MAX,
		},
	});

	const dayIds = [id("d"), id("d")];
	await db.assessmentDay.createMany({
		data: [
			{ id: dayIds[0]!, assessmentCenterId: acId, date: new Date("2026-11-07") },
			{ id: dayIds[1]!, assessmentCenterId: acId, date: new Date("2026-11-08") },
		],
	});

	const taskIds = new Map<string, string>();
	const criteriaIds = new Map<string, Array<{ id: string; weight: number }>>();
	const textCriteria = new Map<string, string>();
	for (const task of TASKS) {
		const taskId = id("t");
		taskIds.set(task.key, taskId);
		await db.task.create({
			data: {
				id: taskId,
				assessmentCenterId: acId,
				name: task.name,
				isTeamTask: task.isTeamTask,
				scoreWeight: task.scoreWeight,
			},
		});
		const groupId = id("cg");
		await db.reviewCriteriaGroup.create({
			data: { id: groupId, taskId, title: "Kriterien" },
		});
		const scored = task.criteria.map((criterion) => ({
			id: id("c"),
			weight: criterion.weight,
			name: criterion.name,
		}));
		const textId = id("c");
		await db.reviewCriteria.createMany({
			data: [
				...scored.map((criterion) => ({
					id: criterion.id,
					taskId,
					criteriaGroupId: groupId,
					name: criterion.name,
					type: "QUANTITATIVE" as const,
					weight: criterion.weight,
				})),
				{
					id: textId,
					taskId,
					criteriaGroupId: groupId,
					name: "Beobachtungen",
					type: "QUALITATIVE" as const,
				},
			],
		});
		criteriaIds.set(task.key, scored);
		textCriteria.set(task.key, textId);
	}

	const reviewerIds = new Map<string, string>();
	for (const name of reviewerNames) {
		const reviewerId = id("r");
		reviewerIds.set(name, reviewerId);
		await db.reviewer.create({
			data: { id: reviewerId, assessmentCenterId: acId, userId: userIds.get(name)! },
		});
	}

	const allPeople = [...PEOPLE.map((person) => person.name), SINGLE_REVIEWER, NO_RATINGS];
	const participantIds = new Map<string, string>();
	await db.participant.createMany({
		data: allPeople.map((name) => {
			const participantId = id("p");
			participantIds.set(name, participantId);
			return { id: participantId, assessmentCenterId: acId, name };
		}),
	});

	// Groups of 8 by order, two per day; every group does every task.
	const groupSize = 8;
	for (let start = 0; start < allPeople.length; start += groupSize) {
		const groupIndex = start / groupSize;
		const groupId = id("g");
		await db.participantGroup.create({
			data: { id: groupId, assessmentCenterId: acId, name: `Gruppe ${String.fromCharCode(65 + groupIndex)}` },
		});
		await db.participantGroupMembership.createMany({
			data: allPeople.slice(start, start + groupSize).map((name) => ({
				id: id("m"),
				participantId: participantIds.get(name)!,
				groupId,
			})),
		});
		await db.scheduleEntry.createMany({
			data: TASKS.map((task, orderIndex) => ({
				id: id("s"),
				dayId: dayIds[groupIndex < 2 ? 0 : 1]!,
				groupId,
				taskId: taskIds.get(task.key)!,
				orderIndex,
			})),
		});
	}

	const abilities = new Map(PEOPLE.map((person) => [person.name, person.ability]));
	abilities.set(SINGLE_REVIEWER, 4);
	const assignments: Array<{ id: string; reviewerId: string; participantId: string; taskId: string }> = [];
	const quantitative: Array<{ id: string; reviewerAssignmentId: string; criteriaId: string; value: number }> = [];
	const qualitative: Array<{ id: string; reviewerAssignmentId: string; criteriaId: string; text: string }> = [];

	for (const entry of plan) {
		for (const reviewer of entry.reviewers) {
			const assignmentId = id("a");
			assignments.push({
				id: assignmentId,
				reviewerId: reviewerIds.get(reviewer)!,
				participantId: participantIds.get(entry.person)!,
				taskId: taskIds.get(entry.task)!,
			});
			for (const criterion of criteriaIds.get(entry.task)!) {
				quantitative.push({
					id: id("q"),
					reviewerAssignmentId: assignmentId,
					criteriaId: criterion.id,
					value: stars(abilities.get(entry.person)!, reviewer),
				});
			}
			qualitative.push({
				id: id("x"),
				reviewerAssignmentId: assignmentId,
				criteriaId: textCriteria.get(entry.task)!,
				text: `Testnotiz von ${reviewer}.`,
			});
		}
	}
	// "Ohne Bewertung" is assigned but never rated.
	for (const task of TASKS) {
		assignments.push({
			id: id("a"),
			reviewerId: reviewerIds.get("Neutral Nora")!,
			participantId: participantIds.get(NO_RATINGS)!,
			taskId: taskIds.get(task.key)!,
		});
	}

	await db.reviewerAssignment.createMany({ data: assignments });
	await db.quantitativeRating.createMany({ data: quantitative });
	await db.qualitativeRating.createMany({ data: qualitative });

	console.log(`Created AC ${acId}: ${assignments.length} assignments, ${quantitative.length} star ratings`);
	console.log("True leniency in stars (≈ × 100 / 6 percentage points):");
	for (const [name, value] of Object.entries(TRUE_LENIENCY)) {
		console.log(`  ${name.padEnd(20)} ${value > 0 ? "+" : ""}${value}  (≈ ${((value * 100) / SCALE_MAX).toFixed(1)} Pkt.)`);
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
