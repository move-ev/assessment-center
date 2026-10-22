/**
 * Fills a database with one sample Assessment Center for manual testing:
 * two groups of six people, three weighted tasks, ratings by two demo
 * reviewers (plus anyone passed with --reviewer-email), free texts, team
 * observations, ressorts with numbers and a few assignments.
 *
 *   bun scripts/seed-sample-ac.ts [--reviewer-email you@move-ev.de] [--status ACTIVE]
 *
 * Reads DATABASE_URL (bun loads .env). Running it again replaces the sample
 * AC; ressorts are shared, so existing ones are reused rather than replaced.
 * Never point it at production.
 */
import { pathToFileURL } from "node:url";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";

type Db = PrismaClient;
type Status = "ACTIVE" | "COMPLETED";

export const SAMPLE_AC_ID = "sample_ac";
const SCALE_MAX = 6;

const PEOPLE = [
	["Anna Berger", 5.4],
	["Ben Schulz", 4.8],
	["Clara Wagner", 4.5],
	["David Hoffmann", 4.1],
	["Emma Fischer", 3.9],
	["Felix Weber", 3.6],
	["Greta Koch", 3.4],
	["Hannes Richter", 3.0],
	["Ida Klein", 2.7],
	["Jonas Wolf", 2.4],
	["Kim Neumann", 2.0],
	["Lena Schwarz", 1.6],
] as const;

const TASKS = [
	{
		id: "t_sp",
		name: "Selbstpräsentation",
		weight: 0.5,
		isTeamTask: false,
		group: "Auftreten",
		criteria: [
			["Präsentation sinnvoll vorbereitet", 2, false],
			["Beantwortet Rückfragen offen", 1, true],
		],
	},
	{
		id: "t_gc",
		name: "Gruppencase",
		weight: 1,
		isTeamTask: true,
		group: "Zusammenarbeit",
		criteria: [
			["Behält die Zeit im Blick", 1, false],
			["Zeigt Kooperationsbereitschaft", 2, false],
		],
	},
	{
		id: "t_ei",
		name: "Einzelinterview",
		weight: 1.5,
		isTeamTask: false,
		group: "Motivation",
		criteria: [
			["Passt persönlich zu move", 3, false],
			["Kennt die eigenen Stärken", 1, false],
		],
	},
] as const;

const DEMO_REVIEWERS = [
	{
		id: "sample_user_rev1",
		name: "Demo Beobachterin",
		email: "demo-reviewer-1@example.com",
	},
	{
		id: "sample_user_rev2",
		name: "Demo Beobachter",
		email: "demo-reviewer-2@example.com",
	},
];

const SAMPLE_RESSORTS = ["Event", "Finanzen", "IT", "Marketing", "Personal"];

/** Deterministic noise, so every run produces the same ranking. */
function makeNoise(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
		return state / 2_147_483_648 - 0.5;
	};
}

function toStars(value: number) {
	return Math.min(SCALE_MAX, Math.max(1, Math.round(value)));
}

async function createStructure(db: Db, status: Status) {
	await db.assessmentCenter.deleteMany({ where: { id: SAMPLE_AC_ID } });
	await db.assessmentCenter.create({
		data: {
			id: SAMPLE_AC_ID,
			name: "Beispiel-AC (Testdaten)",
			description: "Erzeugt von scripts/seed-sample-ac.ts zum Ausprobieren.",
			status,
			isDemo: true,
			ratingScaleMax: SCALE_MAX,
			days: { create: [{ id: "sample_d1", date: new Date("2026-11-07") }] },
			groups: {
				create: [
					{ id: "sample_g_a", name: "Gruppe A" },
					{ id: "sample_g_b", name: "Gruppe B" },
				],
			},
		},
	});
	await db.participant.createMany({
		data: PEOPLE.map(([name], index) => ({
			id: `sample_p${index + 1}`,
			assessmentCenterId: SAMPLE_AC_ID,
			name,
			email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
		})),
	});
	await db.participantGroupMembership.createMany({
		data: PEOPLE.map((_, index) => ({
			participantId: `sample_p${index + 1}`,
			// Alternate so both groups get strong and weak people.
			groupId: index % 2 === 0 ? "sample_g_a" : "sample_g_b",
		})),
	});
	await createTasks(db);
}

async function createTasks(db: Db) {
	for (const [order, task] of TASKS.entries()) {
		await db.task.create({
			data: {
				id: task.id.replace("t_", "sample_t_"),
				assessmentCenterId: SAMPLE_AC_ID,
				name: task.name,
				isTeamTask: task.isTeamTask,
				scoreWeight: task.weight,
				// Tasks are listed by creation time.
				createdAt: new Date(Date.UTC(2026, 0, 1, 0, order)),
				criteriaGroups: {
					create: [{ id: `sample_cg_${task.id}`, title: task.group }],
				},
			},
		});
		await db.reviewCriteria.createMany({
			data: [
				...task.criteria.map(([name, weight, isOptional], index) => ({
					id: `sample_c_${task.id}_${index}`,
					taskId: task.id.replace("t_", "sample_t_"),
					criteriaGroupId: `sample_cg_${task.id}`,
					name,
					type: "QUANTITATIVE" as const,
					weight,
					isOptional,
					anchorStar2: "Erwartung kaum erfüllt",
					anchorStar4: "Erwartung erfüllt",
					createdAt: new Date(Date.UTC(2026, 0, 1, 0, order, index)),
				})),
				{
					id: `sample_c_${task.id}_text`,
					taskId: task.id.replace("t_", "sample_t_"),
					criteriaGroupId: `sample_cg_${task.id}`,
					name: "Sonstige Anmerkungen",
					type: "QUALITATIVE" as const,
					createdAt: new Date(Date.UTC(2026, 0, 1, 0, order, 59)),
				},
			],
		});
		await db.scheduleEntry.createMany({
			data: ["sample_g_a", "sample_g_b"].map((groupId) => ({
				dayId: "sample_d1",
				groupId,
				taskId: task.id.replace("t_", "sample_t_"),
				orderIndex: order,
			})),
		});
	}
}

/** Demo reviewers plus existing users by email (they must have signed in once). */
async function createReviewers(db: Db, emails: string[]) {
	for (const reviewer of DEMO_REVIEWERS) {
		await db.user.upsert({
			where: { email: reviewer.email },
			create: { ...reviewer, emailVerified: true, role: "user" },
			update: {},
		});
	}
	const users = await db.user.findMany({
		where: {
			email: { in: [...DEMO_REVIEWERS.map((r) => r.email), ...emails] },
		},
		select: { id: true, email: true },
	});
	const missing = emails.filter(
		(email) => !users.some((u) => u.email === email),
	);
	if (missing.length > 0) {
		throw new Error(
			`Kein Benutzer mit ${missing.join(", ")}. Erst einmal in der App anmelden.`,
		);
	}
	await db.reviewer.createMany({
		data: users.map((user) => ({
			id: `sample_rev_${user.id}`,
			assessmentCenterId: SAMPLE_AC_ID,
			userId: user.id,
		})),
	});
	return users.map((user) => ({
		reviewerId: `sample_rev_${user.id}`,
		isDemo: DEMO_REVIEWERS.some((r) => r.email === user.email),
	}));
}

/**
 * Every reviewer rates every person in every task. Ratings follow each
 * person's ability with a little noise and reviewers agree, except that one
 * reviewer judges Clara's Gruppencase two stars higher, so the strong
 * deviation mark shows up once. With
 * status ACTIVE only the demo reviewers have rated.
 */
async function createRatings(
	db: Db,
	reviewers: Array<{ reviewerId: string; isDemo: boolean }>,
	status: Status,
) {
	const noise = makeNoise(46);
	const assignments = [];
	const ratings = [];
	for (const [personIndex, [, ability]] of PEOPLE.entries()) {
		const participantId = `sample_p${personIndex + 1}`;
		for (const task of TASKS) {
			const taskId = task.id.replace("t_", "sample_t_");
			// Reviewers agree, so only the planted case counts as a deviation.
			const stars = task.criteria.map(() => ability + noise() * 1.6);
			for (const [reviewerIndex, reviewer] of reviewers.entries()) {
				const assignmentId = `sample_a_${reviewer.reviewerId}_${participantId}_${task.id}`;
				assignments.push({
					id: assignmentId,
					reviewerId: reviewer.reviewerId,
					participantId,
					taskId,
				});
				if (!reviewer.isDemo && status === "ACTIVE") continue;
				const deviation =
					participantId === "sample_p3" &&
					task.id === "t_gc" &&
					reviewerIndex === 0
						? 2
						: 0;
				for (const [criterionIndex, value] of stars.entries()) {
					ratings.push({
						reviewerAssignmentId: assignmentId,
						criteriaId: `sample_c_${task.id}_${criterionIndex}`,
						value: toStars(value + deviation),
					});
				}
			}
		}
	}
	await db.reviewerAssignment.createMany({ data: assignments });
	await db.quantitativeRating.createMany({ data: ratings });
	return assignments;
}

const FREE_TEXTS = [
	["sample_p1", "t_sp", "Sehr souverän, klare Struktur und gute Beispiele."],
	["sample_p2", "t_ei", "Kennt move schon gut, stellt durchdachte Fragen."],
	["sample_p11", "t_sp", "Wirkte nervös, inhaltlich aber solide vorbereitet."],
] as const;

const TEAM_NOTES = [
	[
		"sample_g_a",
		"Gruppe A hat sich schnell organisiert und die Zeit gut genutzt.",
	],
	[
		"sample_g_b",
		"Gruppe B hat lange diskutiert, am Ende aber ein gutes Ergebnis.",
	],
] as const;

async function createTexts(db: Db, firstReviewerId: string) {
	await db.qualitativeRating.createMany({
		data: FREE_TEXTS.map(([participantId, taskId, text]) => ({
			reviewerAssignmentId: `sample_a_${firstReviewerId}_${participantId}_${taskId}`,
			criteriaId: `sample_c_${taskId}_text`,
			text,
		})),
	});
	await db.teamTaskObservation.createMany({
		data: TEAM_NOTES.map(([groupId, notes]) => ({
			taskId: "sample_t_gc",
			groupId,
			reviewerId: firstReviewerId,
			notes,
		})),
	});
}

/**
 * Reuses the ressorts that exist, creating a few only on an empty database.
 * Enters numbers for up to four of them and assigns the top people, one
 * ressort beyond its target so the warning shows.
 */
async function createRessortPlan(db: Db) {
	if ((await db.ressort.count()) === 0) {
		await db.ressort.createMany({
			data: SAMPLE_RESSORTS.map((name) => ({ name })),
		});
	}
	const ressorts = await db.ressort.findMany({
		orderBy: { name: "asc" },
		take: 4,
	});
	await db.acRessortCapacity.createMany({
		data: ressorts.map((ressort, index) => ({
			assessmentCenterId: SAMPLE_AC_ID,
			ressortId: ressort.id,
			registered: 12 + index * 3,
			active: 8 + index * 2,
			toAdmit: index === 0 ? 1 : 2,
		})),
	});
	const plan = [
		[0, ["sample_p1", "sample_p4"]],
		[1, ["sample_p2"]],
		[2, ["sample_p3", "sample_p5"]],
	] as const;
	for (const [index, participantIds] of plan) {
		const ressort = ressorts[index];
		if (!ressort) continue;
		await db.participant.updateMany({
			where: { id: { in: [...participantIds] } },
			data: { ressortId: ressort.id },
		});
	}
	return ressorts.map((ressort) => ressort.name);
}

export async function seedSampleAc(
	db: Db,
	options: { reviewerEmails: string[]; status: Status },
) {
	await createStructure(db, options.status);
	const reviewers = await createReviewers(db, options.reviewerEmails);
	const firstDemo = reviewers.find((reviewer) => reviewer.isDemo);
	if (!firstDemo) throw new Error("Demo-Beobachter fehlen");
	await createRatings(db, reviewers, options.status);
	await createTexts(db, firstDemo.reviewerId);
	const ressorts =
		options.status === "COMPLETED" ? await createRessortPlan(db) : [];
	return { reviewers: reviewers.length, ressorts };
}

function parseArgs(argv: string[]) {
	const reviewerEmails: string[] = [];
	let status: Status = "COMPLETED";
	for (let i = 0; i < argv.length; i++) {
		const value = argv[i + 1];
		if (argv[i] === "--reviewer-email" && value) {
			reviewerEmails.push(value);
			i++;
		} else if (
			argv[i] === "--status" &&
			(value === "ACTIVE" || value === "COMPLETED")
		) {
			status = value;
			i++;
		} else {
			throw new Error(`Unbekanntes Argument: ${argv[i]}`);
		}
	}
	return { reviewerEmails, status };
}

// Runs only when started directly, not when the seed is imported (tests).
const startedDirectly =
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href;

if (startedDirectly) {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL fehlt");
	const db = new PrismaClient({
		adapter: new PrismaNeon({ connectionString: url }),
	});
	const options = parseArgs(process.argv.slice(2));
	const result = await seedSampleAc(db, options);
	await db.$disconnect();
	console.info(
		`Beispiel-AC angelegt (${options.status}): ${PEOPLE.length} Bewerbende, ${result.reviewers} Beobachter` +
			(result.ressorts.length > 0
				? `, Ressorts: ${result.ressorts.join(", ")}`
				: ""),
	);
}
