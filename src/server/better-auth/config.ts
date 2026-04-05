import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	database: prismaAdapter(db, {
		provider: "postgresql", // or "sqlite" or "mysql"
	}),
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		microsoft: {
			clientId: env.MICROSOFT_CLIENT_ID,
			clientSecret: env.MICROSOFT_CLIENT_SECRET,
			tenantId: env.MICROSOFT_TENANT_ID,
			prompt: "select_account",
		},
	},
});

export type Session = typeof auth.$Infer.Session;
