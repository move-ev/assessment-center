import { Badge } from "@/components/ui/badge";
import { AC_STATUS_LABEL, type AcStatus } from "@/lib/ac-status";

const STATUS_VARIANT: Record<AcStatus, "secondary" | "default" | "outline"> = {
	DRAFT: "secondary",
	ACTIVE: "default",
	COMPLETED: "outline",
	ANONYMIZED: "outline",
};

function AcStatusBadge({ status }: { status: AcStatus }) {
	return (
		<Badge variant={STATUS_VARIANT[status]}>{AC_STATUS_LABEL[status]}</Badge>
	);
}

export { AcStatusBadge };
