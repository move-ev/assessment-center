import { getReviewTaskListData, ReviewTaskList } from "@/modules/review";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcReviewPage({ params }: Props) {
	const { id } = await params;
	const tasks = await getReviewTaskListData(id);

	return <ReviewTaskList acId={id} tasks={tasks} />;
}
