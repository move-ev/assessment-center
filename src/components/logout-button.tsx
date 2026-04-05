"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTE } from "@/lib/routes";
import { authClient } from "@/server/better-auth/client";

type Props = {
	variant?: "ghost" | "outline";
	size?: "sm" | "default";
};

function LogoutButton({ variant = "outline", size = "sm" }: Props) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	async function handleLogout() {
		try {
			setIsPending(true);
			await authClient.signOut();
			router.replace(AUTH_ROUTE);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Abmeldung fehlgeschlagen",
			);
		} finally {
			setIsPending(false);
		}
	}

	return (
		<Button
			disabled={isPending}
			onClick={handleLogout}
			size={size}
			type="button"
			variant={variant}
		>
			<LogOutIcon className="h-4 w-4" />
			Abmelden
		</Button>
	);
}

export { LogoutButton };
