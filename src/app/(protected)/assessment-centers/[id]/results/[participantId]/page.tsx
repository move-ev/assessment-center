import {
	EvaluationParticipantDetail,
	getEvaluationParticipantDetailData,
} from "@/modules/evaluation";

type Props = {
	params: Promise<{ id: string; participantId: string }>;
};

export default async function AcResultParticipantPage({ params }: Props) {
	const { id, participantId } = await params;
	const data = await getEvaluationParticipantDetailData(id, participantId);

	return <EvaluationParticipantDetail acId={id} data={data} />;
}
