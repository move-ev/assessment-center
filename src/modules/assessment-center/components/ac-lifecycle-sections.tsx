"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AC_STATUS_LABEL, type AcStatus } from "@/lib/ac-status";
import { formatDate } from "@/lib/format-date";
import { ROUTES } from "@/lib/routes";
import { api } from "@/trpc/react";
import { AcConfirmByNameDialog } from "./ac-confirm-by-name-dialog";

type Utils = ReturnType<typeof api.useUtils>;

type Props = {
	acId: string;
	acName: string;
	anonymizedAt: Date | null;
	status: AcStatus;
	utils: Utils;
};

/** Status transitions, anonymizing and deleting at the end of the details page. */
function AcLifecycleSections({
	acId,
	acName,
	anonymizedAt,
	status,
	utils,
}: Props) {
	return (
		<>
			{status === "ANONYMIZED" ? (
				<AnonymizedStatus anonymizedAt={anonymizedAt} />
			) : (
				<StatusSection acId={acId} currentStatus={status} utils={utils} />
			)}

			{status === "COMPLETED" && (
				<>
					<Separator />
					<AnonymizeSection acId={acId} acName={acName} utils={utils} />
				</>
			)}

			<Separator />

			<DeleteSection acId={acId} acName={acName} utils={utils} />
		</>
	);
}

function AnonymizedStatus({ anonymizedAt }: { anonymizedAt: Date | null }) {
	return (
		<div className="space-y-1">
			<h3 className="font-medium text-sm">Status</h3>
			<p className="text-muted-foreground text-sm">
				Das Assessment Center wurde
				{anonymizedAt ? ` am ${formatDate(anonymizedAt)}` : ""} anonymisiert und
				ist dauerhaft schreibgeschützt.
			</p>
		</div>
	);
}

type StatusSectionProps = {
	acId: string;
	currentStatus: Exclude<AcStatus, "ANONYMIZED">;
	utils: Utils;
};

function StatusSection({ acId, currentStatus, utils }: StatusSectionProps) {
	const router = useRouter();
	const { data: progress } = api.assessmentCenter.getSetupProgress.useQuery(
		{ acId },
		{ enabled: currentStatus === "DRAFT" },
	);

	const transitionMutation =
		api.assessmentCenter.transitionToActive.useMutation({
			onSuccess: async () => {
				await utils.assessmentCenter.getDetails.invalidate({ id: acId });
				router.refresh();
				toast.success("Assessment Center wurde aktiviert");
			},
			onError: (error) => toast.error(error.message),
		});
	const completeMutation =
		api.assessmentCenter.transitionToCompleted.useMutation({
			onSuccess: async () => {
				await utils.assessmentCenter.getDetails.invalidate({ id: acId });
				router.refresh();
				toast.success("Assessment Center wurde abgeschlossen");
			},
			onError: (error) => toast.error(error.message),
		});
	const reopenMutation = api.assessmentCenter.reopen.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			router.refresh();
			toast.success("Assessment Center wurde wieder geöffnet");
		},
		onError: (error) => toast.error(error.message),
	});

	if (currentStatus === "COMPLETED") {
		return (
			<div className="space-y-4">
				<div>
					<h3 className="font-medium text-sm">Status</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						Das Assessment Center ist{" "}
						<strong className="text-foreground">
							{AC_STATUS_LABEL[currentStatus]}
						</strong>
						. Du kannst es wieder öffnen, um Bewertungen nachzupflegen.
					</p>
				</div>
				<Button
					disabled={reopenMutation.isPending}
					onClick={() => reopenMutation.mutate({ id: acId })}
					variant="outline"
				>
					{reopenMutation.isPending ? "Öffne..." : "AC wieder öffnen"}
				</Button>
			</div>
		);
	}

	if (currentStatus === "ACTIVE") {
		return (
			<div className="space-y-4">
				<div>
					<h3 className="font-medium text-sm">Abschließen</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						Sobald das Assessment Center beendet ist, kann es abgeschlossen und
						in die Ergebnisse überführt werden.
					</p>
				</div>
				<Button
					disabled={completeMutation.isPending}
					onClick={() => completeMutation.mutate({ id: acId })}
				>
					{completeMutation.isPending
						? "Wird abgeschlossen..."
						: "AC abschließen"}
				</Button>
			</div>
		);
	}

	const allStepsComplete =
		progress !== undefined &&
		progress.dayCount > 0 &&
		progress.participantCount > 0 &&
		progress.groupCount > 0 &&
		progress.taskCount > 0 &&
		progress.scheduleEntryCount > 0 &&
		progress.reviewerCount > 0 &&
		progress.assignmentCount > 0;

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-medium text-sm">Aktivieren</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Sobald alle Einrichtungsschritte abgeschlossen sind, kann das AC
					aktiviert werden.
				</p>
			</div>
			<Button
				disabled={!allStepsComplete || transitionMutation.isPending}
				onClick={() => transitionMutation.mutate({ id: acId })}
			>
				{transitionMutation.isPending ? "Aktiviert..." : "AC aktivieren"}
			</Button>
			{!allStepsComplete && progress !== undefined && (
				<p className="text-muted-foreground text-sm">
					Schließe alle 7 Einrichtungsschritte ab, um das AC zu aktivieren.
				</p>
			)}
		</div>
	);
}

type AnonymizeSectionProps = {
	acId: string;
	acName: string;
	utils: Utils;
};

function AnonymizeSection({ acId, acName, utils }: AnonymizeSectionProps) {
	const router = useRouter();
	const anonymizeMutation = api.assessmentCenter.anonymize.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			router.refresh();
			toast.success("Assessment Center wurde anonymisiert");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-medium text-sm">Anonymisieren</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Entfernt nach dem AC alle personenbezogenen Daten der Bewerbenden. Die
					Zahlenbewertungen bleiben für spätere Jahrgangsvergleiche erhalten.
				</p>
			</div>
			<AcConfirmByNameDialog
				acName={acName}
				confirmLabel="Endgültig anonymisieren"
				description={
					<div className="space-y-2">
						<p>Das lässt sich nicht rückgängig machen:</p>
						<ul className="list-disc space-y-1 pl-5">
							<li>Namen werden zu „Bewerbende 1…n“ (zufällige Reihenfolge)</li>
							<li>E-Mail-Adressen und Bilder werden entfernt</li>
							<li>Gruppennamen werden zu „Gruppe 1…n“</li>
							<li>
								Alle Freitext-Bewertungen und Gruppenbeobachtungen werden
								gelöscht
							</li>
							<li>Bereits entfernte Bewerbende werden endgültig gelöscht</li>
						</ul>
						<p>
							Danach ist das AC dauerhaft schreibgeschützt und nur noch für
							Admins sichtbar.
						</p>
					</div>
				}
				isPending={anonymizeMutation.isPending}
				onConfirm={() => anonymizeMutation.mutate({ id: acId })}
				pendingLabel="Anonymisiert..."
				title="Assessment Center anonymisieren?"
				triggerLabel="AC anonymisieren"
			/>
		</div>
	);
}

type DeleteSectionProps = {
	acId: string;
	acName: string;
	utils: Utils;
};

function DeleteSection({ acId, acName, utils }: DeleteSectionProps) {
	const router = useRouter();
	const deleteMutation = api.assessmentCenter.delete.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.listForUser.invalidate();
			toast.success("Assessment Center wurde gelöscht");
			router.push(ROUTES.dashboard());
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-medium text-sm">AC löschen</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Löscht das Assessment Center endgültig mit allen Bewerbenden,
					Aufgaben, Bewertungen und Beobachtungen, zum Beispiel nach einer Demo.
				</p>
			</div>
			<AcConfirmByNameDialog
				acName={acName}
				confirmLabel="Endgültig löschen"
				description={
					<p>
						Alle Daten dieses Assessment Centers werden gelöscht. Das lässt sich
						nicht rückgängig machen. Die Benutzerkonten der Beobachter bleiben
						erhalten.
					</p>
				}
				isPending={deleteMutation.isPending}
				onConfirm={() => deleteMutation.mutate({ id: acId })}
				pendingLabel="Löscht..."
				title="Assessment Center löschen?"
				triggerLabel="AC löschen"
			/>
		</div>
	);
}

export { AcLifecycleSections };
