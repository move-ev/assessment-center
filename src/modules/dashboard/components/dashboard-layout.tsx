"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

type Props = {
	userName: string;
	isAdmin: boolean;
	children: React.ReactNode;
};

function DashboardLayout({ userName, isAdmin, children }: Props) {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="border-b bg-background px-6 py-3">
				<div className="flex items-center justify-between">
					<span className="font-semibold text-foreground">
						Assessment Center
					</span>
					<div className="flex items-center gap-3">
						{isAdmin && (
							<Link
								className={buttonVariants({ size: "sm" })}
								href={ROUTES.acNew()}
							>
								Neues AC
							</Link>
						)}
						<span className="text-muted-foreground text-sm">{userName}</span>
					</div>
				</div>
			</header>
			<main className="flex-1 p-6">{children}</main>
		</div>
	);
}

export { DashboardLayout };
