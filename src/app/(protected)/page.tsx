import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function ProtectedRootPage() {
	redirect(ROUTES.dashboard());
}
