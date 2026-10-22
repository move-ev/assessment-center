"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { api } from "@/trpc/react";
import type { RessortCapacityRow } from "../server/get-ressort-capacities";

type Props = {
	acId: string;
	participant: { id: string; name: string; ressortId: string | null };
	ressorts: RessortCapacityRow[];
};

const UNASSIGNED = "";

/**
 * Assigns a person to a ressort, moves them, or removes the assignment
 * ("Nicht zugeteilt"). Admins only; the server checks that too.
 */
function RessortSelect({ acId, participant, ressorts }: Props) {
	const router = useRouter();
	const assign = api.ressort.assign.useMutation({
		onSuccess: ({ ressort }) => {
			if (!ressort) {
				toast.success(`${participant.name}: Zuteilung entfernt`);
			} else if (ressort.overBy > 0) {
				toast.warning(`${ressort.name}: ${ressort.label}`, {
					description: `${participant.name} ist trotzdem zugeteilt.`,
				});
			} else {
				toast.success(`${participant.name} → ${ressort.name}`);
			}
			router.refresh();
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<NativeSelect
			aria-label={`Ressort von ${participant.name}`}
			disabled={assign.isPending}
			onChange={(event) =>
				assign.mutate({
					acId,
					participantId: participant.id,
					ressortId:
						event.target.value === UNASSIGNED ? null : event.target.value,
				})
			}
			size="sm"
			value={participant.ressortId ?? UNASSIGNED}
		>
			<NativeSelectOption value={UNASSIGNED}>
				{participant.ressortId ? "Nicht zugeteilt" : "Zu Ressort hinzufügen"}
			</NativeSelectOption>
			{ressorts.map((ressort) => (
				<NativeSelectOption key={ressort.ressortId} value={ressort.ressortId}>
					{ressort.slots.label
						? `${ressort.name} · ${ressort.slots.label}`
						: ressort.name}
				</NativeSelectOption>
			))}
		</NativeSelect>
	);
}

export { RessortSelect };
