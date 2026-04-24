import { MDXRemote } from "next-mdx-remote/rsc";
import { getReviewRatingFormData, ReviewRatingForm } from "@/modules/review";

type Props = {
	params: Promise<{ id: string; taskId: string; participantId: string }>;
};

export default async function AcReviewRatingPage({ params }: Props) {
	const { id, taskId, participantId } = await params;
	const data = await getReviewRatingFormData(id, taskId, participantId);

	const instructionsContent = data.task.instructions ? (
		<MDXRemote source={data.task.instructions} />
	) : undefined;

	return (
		<ReviewRatingForm
			acId={id}
			data={data}
			instructionsContent={instructionsContent}
			taskId={taskId}
		/>
	);
}
