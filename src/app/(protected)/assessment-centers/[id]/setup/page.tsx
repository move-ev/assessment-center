import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupPage({ params }: Props) {
	const { id } = await params;
	redirect(ROUTES.acSetupDetails(id));
}
