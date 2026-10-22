import type { AssignedRessort } from "@/lib/ressort-assignment";
import type { RessortCapacityRow } from "../server/get-ressort-capacities";
import { RessortSelect } from "./ressort-select";

type Props = {
	acId: string;
	participant: { id: string; name: string; ressort: AssignedRessort | null };
	/** Admins pick the ressort; everyone else reads it. */
	canManage: boolean;
	ressorts: RessortCapacityRow[];
};

/** A person's ressort: a picker for admins, the plain name for everyone else. */
function RessortAssignment({ acId, participant, canManage, ressorts }: Props) {
	if (!canManage) {
		return (
			<span className="text-muted-foreground">
				{participant.ressort?.name ?? "–"}
			</span>
		);
	}
	return (
		<RessortSelect
			acId={acId}
			participant={{
				id: participant.id,
				name: participant.name,
				ressortId: participant.ressort?.id ?? null,
			}}
			ressorts={ressorts}
		/>
	);
}

export { RessortAssignment };
