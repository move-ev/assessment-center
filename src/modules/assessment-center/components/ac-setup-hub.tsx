"use client";

import { CheckIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type SetupProgress = {
	dayCount: number;
	participantCount: number;
	groupCount: number;
	taskCount: number;
	scheduleEntryCount: number;
	reviewerCount: number;
	assignmentCount: number;
};

type StepConfig = {
	key: string;
	label: string;
	route: (acId: string) => string;
	isAvailable: (p: SetupProgress) => boolean;
	isComplete: (p: SetupProgress) => boolean;
	/** False for steps whose page routes are not yet implemented. */
	isImplemented: boolean;
};

const STEPS: StepConfig[] = [
	{
		key: "details",
		label: "Details",
		route: ROUTES.acSetupDetails,
		isAvailable: () => true,
		isComplete: (p) => p.dayCount > 0,
		isImplemented: true,
	},
	{
		key: "participants",
		label: "Teilnehmer",
		route: ROUTES.acSetupParticipants,
		isAvailable: () => true,
		isComplete: (p) => p.participantCount > 0,
		isImplemented: true,
	},
	{
		key: "groups",
		label: "Gruppen",
		route: ROUTES.acSetupGroups,
		isAvailable: (p) => p.participantCount > 0,
		isComplete: (p) => p.groupCount > 0,
		isImplemented: true,
	},
	{
		key: "tasks",
		label: "Aufgaben",
		route: ROUTES.acSetupTasks,
		isAvailable: () => true,
		isComplete: (p) => p.taskCount > 0,
		isImplemented: true,
	},
	{
		key: "schedule",
		label: "Zeitplan",
		route: ROUTES.acSetupSchedule,
		isAvailable: (p) => p.groupCount > 0 && p.taskCount > 0 && p.dayCount > 0,
		isComplete: (p) => p.scheduleEntryCount > 0,
		isImplemented: true,
	},
	{
		key: "reviewers",
		label: "Bewerter",
		route: ROUTES.acSetupReviewers,
		isAvailable: () => true,
		isComplete: (p) => p.reviewerCount > 0,
		isImplemented: true,
	},
	{
		key: "assignments",
		label: "Zuweisungen",
		route: ROUTES.acSetupAssignments,
		isAvailable: (p) =>
			p.participantCount > 0 && p.taskCount > 0 && p.reviewerCount > 0,
		isComplete: (p) => p.assignmentCount > 0,
		isImplemented: true,
	},
];

type Props = {
	acId: string;
	isReadOnly: boolean;
	children: React.ReactNode;
};

function AcSetupHub({ acId, isReadOnly, children }: Props) {
	const pathname = usePathname();
	const { data: progress } = api.assessmentCenter.getSetupProgress.useQuery({
		acId,
	});

	return (
		<div className="flex flex-1">
			<aside className="w-56 shrink-0 border-r bg-background p-4">
				<p className="mb-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
					Einrichtung
				</p>
				<ol className="flex flex-col gap-0.5">
					{STEPS.map((step, index) => {
						const href = step.route(acId);
						const isActive = pathname.startsWith(href);
						const available = progress ? step.isAvailable(progress) : index < 2;
						const complete = progress ? step.isComplete(progress) : false;

						return (
							<li key={step.key}>
								<StepLink
									href={href}
									index={index}
									isActive={isActive}
									isAvailable={available && step.isImplemented}
									isComplete={complete}
									isImplemented={step.isImplemented}
									label={step.label}
								/>
							</li>
						);
					})}
				</ol>
			</aside>
			<main className="flex-1 overflow-auto p-6">
				{isReadOnly && (
					<div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
						<LockIcon className="h-4 w-4 shrink-0" />
						Das Assessment Center ist abgeschlossen. Öffne es wieder, um die
						Einrichtung zu bearbeiten.
					</div>
				)}
				{children}
			</main>
		</div>
	);
}

type StepLinkProps = {
	href: string;
	label: string;
	index: number;
	isActive: boolean;
	isAvailable: boolean;
	isComplete: boolean;
	isImplemented: boolean;
};

function StepLink({
	href,
	label,
	index,
	isActive,
	isAvailable,
	isComplete,
	isImplemented,
}: StepLinkProps) {
	const inner = (
		<span
			className={cn(
				"flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
				isActive && "bg-accent font-medium text-accent-foreground",
				!isActive && isAvailable && "text-foreground hover:bg-accent/50",
				!isAvailable && "cursor-not-allowed text-muted-foreground/50",
			)}
		>
			<span
				className={cn(
					"flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
					isComplete
						? "bg-primary text-primary-foreground"
						: "border border-border text-muted-foreground",
				)}
			>
				{isComplete ? <CheckIcon className="h-3 w-3" /> : index + 1}
			</span>
			<span className="flex-1">{label}</span>
			{!isImplemented && (
				<span className="text-[10px] text-muted-foreground/60">bald</span>
			)}
		</span>
	);

	if (!isAvailable) {
		return inner;
	}

	return <Link href={href}>{inner}</Link>;
}

export { AcSetupHub };
