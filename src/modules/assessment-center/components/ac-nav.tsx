"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AcStatus } from "@/lib/ac-status";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
	acId: string;
	isAdmin: boolean;
	acStatus: AcStatus;
};

type NavItem = {
	label: string;
	href: string;
	visible: boolean;
};

function AcNav({ acId, isAdmin, acStatus }: Props) {
	const pathname = usePathname();

	const items: NavItem[] = [
		{
			label: "Einrichtung",
			href: ROUTES.acSetup(acId),
			visible: isAdmin,
		},
		{
			label: "Live-Übersicht",
			href: ROUTES.acOverview(acId),
			visible: isAdmin && (acStatus === "ACTIVE" || acStatus === "COMPLETED"),
		},
		{
			label: "Ergebnisse",
			href: ROUTES.acResults(acId),
			visible:
				isAdmin && (acStatus === "COMPLETED" || acStatus === "ANONYMIZED"),
		},
		{
			label: "Review",
			href: ROUTES.acReview(acId),
			visible: !isAdmin,
		},
	];

	const visibleItems = items.filter((item) => item.visible);

	return (
		<nav className="border-b bg-background px-6">
			<ul className="flex gap-1">
				{visibleItems.map((item) => {
					const isActive = pathname.startsWith(item.href);
					return (
						<li key={item.href}>
							<Link
								className={cn(
									"inline-block border-b-2 px-3 py-3 font-medium text-sm transition-colors",
									isActive
										? "border-primary text-foreground"
										: "border-transparent text-muted-foreground hover:text-foreground",
								)}
								href={item.href}
							>
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

export { AcNav };
