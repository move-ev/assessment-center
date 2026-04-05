export const HOME_ROUTE = "/";
export const AUTH_ROUTE = "/auth";

export const ROUTES = {
	auth: () => "/auth",
	dashboard: () => "/dashboard",
	acNew: () => "/assessment-centers/new",
	ac: (id: string) => `/assessment-centers/${id}`,
	acSetup: (id: string) => `/assessment-centers/${id}/setup`,
	acSetupDetails: (id: string) => `/assessment-centers/${id}/setup/details`,
	acSetupParticipants: (id: string) =>
		`/assessment-centers/${id}/setup/participants`,
	acSetupGroups: (id: string) => `/assessment-centers/${id}/setup/groups`,
	acSetupTasks: (id: string) => `/assessment-centers/${id}/setup/tasks`,
	acSetupTask: (id: string, taskId: string) =>
		`/assessment-centers/${id}/setup/tasks/${taskId}`,
	acSetupSchedule: (id: string) => `/assessment-centers/${id}/setup/schedule`,
	acSetupReviewers: (id: string) => `/assessment-centers/${id}/setup/reviewers`,
	acSetupAssignments: (id: string) =>
		`/assessment-centers/${id}/setup/assignments`,
	acOverview: (id: string) => `/assessment-centers/${id}/overview`,
	acResults: (id: string) => `/assessment-centers/${id}/results`,
	acReview: (id: string) => `/assessment-centers/${id}/review`,
	acReviewTask: (id: string, taskId: string) =>
		`/assessment-centers/${id}/review/${taskId}`,
	acReviewRating: (id: string, taskId: string, participantId: string) =>
		`/assessment-centers/${id}/review/${taskId}/${participantId}`,
} as const;
