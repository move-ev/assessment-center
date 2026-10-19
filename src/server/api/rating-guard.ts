import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import type { Prisma } from "../../../generated/prisma/client";

/**
 * Deleting reviewer assignments cascades to their ratings. Removing a
 * reviewer, a task or a single assignment must not silently throw away
 * submitted ratings, so it is refused while any exist.
 */
export async function assertNoSubmittedRatings(
	where: Prisma.ReviewerAssignmentWhereInput,
	message: string,
): Promise<void> {
	const [quantitative, qualitative] = await Promise.all([
		db.quantitativeRating.count({
			where: { deletedAt: null, reviewerAssignment: where },
		}),
		db.qualitativeRating.count({
			where: { deletedAt: null, reviewerAssignment: where },
		}),
	]);

	if (quantitative + qualitative > 0) {
		throw new TRPCError({ code: "CONFLICT", message });
	}
}
