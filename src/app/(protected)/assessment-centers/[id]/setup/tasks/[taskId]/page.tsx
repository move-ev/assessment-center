import { AcTaskDetail } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string; taskId: string }>;
};

export default async function AcSetupTaskDetailPage({ params }: Props) {
	const { id, taskId } = await params;
	return <AcTaskDetail acId={id} taskId={taskId} />;
}
