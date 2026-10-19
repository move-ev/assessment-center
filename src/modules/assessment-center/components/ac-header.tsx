import Link from "next/link";
import { AcStatusBadge } from "@/components/ac-status-badge";
import { LogoutButton } from "@/components/logout-button";
import type { AcStatus } from "@/lib/ac-status";
import { ROUTES } from "@/lib/routes";

type Props = {
	id: string;
	name: string;
	status: AcStatus;
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
					<AcStatusBadge status={status} />
				</div>
				<LogoutButton variant="ghost" />
			</div>
		</header>
	);
}

export { AcHeader };
