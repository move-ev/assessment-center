import {
	EvaluationParticipant,
	getEvaluationResultsData,
} from "@/modules/evaluation";
import { getRessortCapacities } from "@/modules/ressort";
import { requireResultsAccess } from "@/server/ac-role";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcResultsPage({ params }: Props) {
	const { id } = await params;
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
			ressorts={ressorts}
			results={results}
		/>
	);
}
