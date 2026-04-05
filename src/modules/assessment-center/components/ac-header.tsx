import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/routes";

type AcStatus = "DRAFT" | "ACTIVE" | "COMPLETED";

type Props = {
	id: string;
	name: string;
	status: AcStatus;
};

const STATUS_LABEL: Record<AcStatus, string> = {
	DRAFT: "Entwurf",
	ACTIVE: "Aktiv",
	COMPLETED: "Abgeschlossen",
};

const STATUS_VARIANT: Record<AcStatus, "secondary" | "default" | "outline"> = {
	DRAFT: "secondary",
	ACTIVE: "default",
	COMPLETED: "outline",
};

function AcHeader({ id, name, status }: Props) {
	return (
		<header className="border-b bg-background px-6 py-3">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-sm">
					<Link
						className="text-muted-foreground transition-colors hover:text-foreground"
						href={ROUTES.dashboard()}
					>
						Dashboard
					</Link>
					<span className="text-muted-foreground">/</span>
					<Link
						className="font-medium text-foreground hover:underline"
						href={ROUTES.ac(id)}
					>
						{name}
					</Link>
					<Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
				</div>
				<LogoutButton variant="ghost" />
			</div>
		</header>
	);
}

export { AcHeader };
