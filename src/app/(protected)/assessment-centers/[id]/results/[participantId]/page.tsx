import {
	EvaluationParticipantDetail,
	getEvaluationParticipantDetailData,
} from "@/modules/evaluation";
import { getRessortCapacities } from "@/modules/ressort";
import { requireResultsAccess } from "@/server/ac-role";

type Props = {
	params: Promise<{ id: string; participantId: string }>;
};

export default async function AcResultParticipantPage({ params }: Props) {
	const { id, participantId } = await params;
	const { canManage } = await requireResultsAccess(id);
	const [data, ressorts] = await Promise.all([
		getEvaluationParticipantDetailData(id, participantId),
		getRessortCapacities(id),
	]);

	return (
		<EvaluationParticipantDetail
			acId={id}
			canManage={canManage}
			data={data}
			ressorts={ressorts}
		/>
	);
}
