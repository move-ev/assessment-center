import { PrismaNeon } from "@prisma/adapter-neon";
import { env } from "@/env";
import { PrismaClient } from "../../generated/prisma/client";

const createPrismaClient = () => {
	const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
	const prisma = new PrismaClient({ adapter });

	return prisma;
};

const globalForPrisma = globalThis as unknown as {
	prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
