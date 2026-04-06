import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { z } from "zod";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";

const f = createUploadthing();

export const utapi = new UTApi();

export const appFileRouter = {
	participantAvatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
		.input(z.object({ participantId: z.string(), acId: z.string() }))
		.middleware(async ({ req, input }) => {
			const session = await auth.api.getSession({ headers: req.headers });

			if (!session?.user) {
				throw new UploadThingError("Unauthorized");
			}

			if (session.user.role !== "admin") {
				throw new UploadThingError("Forbidden");
			}

			const participant = await db.participant.findFirst({
				where: {
					id: input.participantId,
					assessmentCenterId: input.acId,
					deletedAt: null,
				},
				select: { assessmentCenter: { select: { status: true } } },
			});

			if (!participant) {
				throw new UploadThingError("Participant not found");
			}

			if (participant.assessmentCenter.status !== "DRAFT") {
				throw new UploadThingError("Forbidden");
			}

			return { participantId: input.participantId };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			const existing = await db.participant.findFirst({
				where: { id: metadata.participantId },
				select: { avatarFileKey: true },
			});

			if (existing?.avatarFileKey) {
				await utapi.deleteFiles(existing.avatarFileKey);
			}

			await db.participant.update({
				where: { id: metadata.participantId },
				data: { avatarUrl: file.url, avatarFileKey: file.key },
			});
		}),
} satisfies FileRouter;

export type AppFileRouter = typeof appFileRouter;
