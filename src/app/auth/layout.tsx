import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HOME_ROUTE } from "@/lib/routes";
import { AuthLayout } from "@/modules/auth";
import { auth } from "@/server/better-auth";

export default async function ServerLayout(props: LayoutProps<"/auth">) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session) {
		redirect(HOME_ROUTE);
	}

	return <AuthLayout {...props} />;
}
