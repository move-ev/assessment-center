import { assessmentCenterRouter } from "@/server/api/routers/assessment-center";
import { assignmentRouter } from "@/server/api/routers/assignment";
import { groupRouter } from "@/server/api/routers/group";
import { participantRouter } from "@/server/api/routers/participant";
import { postRouter } from "@/server/api/routers/post";
import { ratingRouter } from "@/server/api/routers/rating";
import { reviewerRouter } from "@/server/api/routers/reviewer";
import { scheduleRouter } from "@/server/api/routers/schedule";
import { taskRouter } from "@/server/api/routers/task";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	assessmentCenter: assessmentCenterRouter,
	participant: participantRouter,
	group: groupRouter,
	task: taskRouter,
	schedule: scheduleRouter,
	reviewer: reviewerRouter,
	assignment: assignmentRouter,
	rating: ratingRouter,
	post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
