import { redirect } from "next/navigation";
import { AUTH_ROUTE } from "@/lib/routes";
import { getSession } from "@/server/better-auth/server";

export default async function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getSession();

	if (!session) {
		redirect(AUTH_ROUTE);
	}

	return <>{children}</>;
}
