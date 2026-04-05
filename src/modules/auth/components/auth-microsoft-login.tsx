"use client";

import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/better-auth/client";

function AuthMicrosoftLogin() {
	const [isLoading, setIsLoading] = React.useState<boolean>(false);

	const handleLogin = async () => {
		try {
			setIsLoading(true);
			await authClient.signIn.social({
				provider: "microsoft",
			});
		} catch (error) {
			if (error instanceof Error) {
				toast.error("Ein Fehler ist aufgetreten", {
					description: error.message ?? "Unbekannter Fehler",
				});
			} else {
				toast.error("Ein Fehler ist aufgetreten", {
					description: "Unbekannter Fehler",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button disabled={isLoading} onClick={handleLogin} variant={"outline"}>
			Login mit Microsoft
		</Button>
	);
}

export { AuthMicrosoftLogin };
