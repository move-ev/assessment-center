import { TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Sonderfall 1: reviewers of a task differ strongly. Amber rather than red,
 * because the bottom 15 % of the ranking are already shown in red.
 */
function DeviationBadge({
	label = "Abweichung",
	taskNames = [],
}: {
	label?: string;
	taskNames?: string[];
}) {
	return (
		<Badge
			className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
			title={
				taskNames.length > 0
					? `Beobachter weichen stark ab: ${taskNames.join(", ")}`
					: undefined
			}
			variant="outline"
		>
			<TriangleAlertIcon className="h-3 w-3" />
			{label}
		</Badge>
	);
}

export { DeviationBadge };
