import Link from "next/link";
import { AcStatusBadge } from "@/components/ac-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type { RouterOutputs } from "@/trpc/react";

type AcSummary = RouterOutputs["assessmentCenter"]["listForUser"][number];

type Props = {
	ac: AcSummary;
};

function DashboardAcCard({ ac }: Props) {
	return (
		<Link className="block" href={ROUTES.ac(ac.id)}>
			<Card className="transition-shadow hover:shadow-md">
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between gap-2">
						<CardTitle className="font-medium text-base">{ac.name}</CardTitle>
						<div className="flex shrink-0 gap-1.5">
							{ac.isDemo && <Badge variant="secondary">Demo</Badge>}
							<AcStatusBadge status={ac.status} />
						</div>
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
