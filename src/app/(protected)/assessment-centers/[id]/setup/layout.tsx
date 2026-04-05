import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/server/better-auth/server";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export default async function AcSetupLayout({ children, params }: Props) {
	const { id } = await params;
	const session = await getSession();

	if (session?.user.role !== "admin") {
		redirect(ROUTES.acReview(id));
	}

	return <>{children}</>;
}
