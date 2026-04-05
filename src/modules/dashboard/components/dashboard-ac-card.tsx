import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type { RouterOutputs } from "@/trpc/react";

type AcStatus = "DRAFT" | "ACTIVE" | "COMPLETED";
type AcSummary = RouterOutputs["assessmentCenter"]["listForUser"][number];

type Props = {
	ac: AcSummary;
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

function DashboardAcCard({ ac }: Props) {
	return (
		<Link className="block" href={ROUTES.ac(ac.id)}>
			<Card className="transition-shadow hover:shadow-md">
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between gap-2">
						<CardTitle className="font-medium text-base">{ac.name}</CardTitle>
						<Badge variant={STATUS_VARIANT[ac.status]}>
							{STATUS_LABEL[ac.status]}
						</Badge>
					</div>
				</CardHeader>
				{ac.description && (
					<CardContent>
						<p className="line-clamp-2 text-muted-foreground text-sm">
							{ac.description}
						</p>
					</CardContent>
				)}
			</Card>
		</Link>
	);
}

export { DashboardAcCard };
