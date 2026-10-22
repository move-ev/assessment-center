import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { RessortManagerPage } from "@/modules/ressort";
import { getSession } from "@/server/better-auth/server";

export default async function RessortsPage() {
	const session = await getSession();
	if (session?.user.role !== "admin") {
		redirect(ROUTES.dashboard());
	}

	return <RessortManagerPage />;
}
