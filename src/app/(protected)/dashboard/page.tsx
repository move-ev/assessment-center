import { DashboardPage as DashboardPageContent } from "@/modules/dashboard";
import { getSession } from "@/server/better-auth/server";

export default async function DashboardPage() {
	const session = await getSession();
	const userName = session?.user.name ?? "";
	const isAdmin = session?.user.role === "admin";

	return <DashboardPageContent userName={userName} isAdmin={isAdmin} />;
}
