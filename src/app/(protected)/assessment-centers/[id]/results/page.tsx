import { parseRessortFilter } from "@/lib/ressort-assignment";
import {
	EvaluationParticipant,
	getEvaluationResultsData,
} from "@/modules/evaluation";
import { getRessortCapacities } from "@/modules/ressort";
import { requireResultsAccess } from "@/server/ac-role";

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ ressort?: string | string[] }>;
};

export default async function AcResultsPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { ressort } = await searchParams;
	const { assessmentCenter, canManage } = await requireResultsAccess(id);
	const [results, ressorts] = await Promise.all([
		getEvaluationResultsData(id),
		getRessortCapacities(id),
	]);

	return (
		<EvaluationParticipant
			acId={id}
			acName={assessmentCenter.name}
			canManage={canManage}
			// A repeated ?ressort= takes the first value.
			ressortFilter={parseRessortFilter(
				Array.isArray(ressort) ? ressort[0] : ressort,
				ressorts.map((row) => row.ressortId),
			)}
			ressorts={ressorts}
			results={results}
		/>
	);
}
