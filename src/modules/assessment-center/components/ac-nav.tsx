"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

type AcStatus = "DRAFT" | "ACTIVE" | "COMPLETED";

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
			visible: isAdmin && acStatus === "COMPLETED",
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
								href={item.href}
								className={cn(
									"inline-block border-b-2 px-3 py-3 text-sm font-medium transition-colors",
									isActive
										? "border-primary text-foreground"
										: "border-transparent text-muted-foreground hover:text-foreground",
								)}
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
