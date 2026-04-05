import {
	getReviewParticipantListData,
	ReviewParticipantList,
} from "@/modules/review";

type Props = {
	params: Promise<{ id: string; taskId: string }>;
};

export default async function AcReviewTaskPage({ params }: Props) {
	const { id, taskId } = await params;
	const data = await getReviewParticipantListData(id, taskId);

	return <ReviewParticipantList acId={id} data={data} taskId={taskId} />;
}
