"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { DashboardAcCard } from "./dashboard-ac-card";

function DashboardAcList() {
	const {
		data: acs,
		isLoading,
		isError,
	} = api.assessmentCenter.listForUser.useQuery();

	if (isLoading) {
		return <AcListSkeleton />;
	}

	if (isError) {
		return (
			<p className="text-destructive text-sm">
				Assessment Centers konnten nicht geladen werden. Bitte Seite neu laden.
			</p>
		);
	}

	if (!acs || acs.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Keine Assessment Centers gefunden.
			</p>
		);
	}

	return (
		<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{acs.map((ac) => (
				<li key={ac.id}>
					<DashboardAcCard ac={ac} />
				</li>
			))}
		</ul>
	);
}

function AcListSkeleton() {
	return (
		<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<li>
				<Skeleton className="h-24 w-full rounded-xl" />
			</li>
			<li>
				<Skeleton className="h-24 w-full rounded-xl" />
			</li>
			<li>
				<Skeleton className="h-24 w-full rounded-xl" />
			</li>
		</ul>
	);
}

export { DashboardAcList };
