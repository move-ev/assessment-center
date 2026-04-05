import {
	EvaluationOverview,
	getEvaluationOverviewData,
} from "@/modules/evaluation";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcOverviewPage({ params }: Props) {
	const { id } = await params;
	const overview = await getEvaluationOverviewData(id);

	return <EvaluationOverview acId={id} overview={overview} />;
}
