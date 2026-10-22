import {
	EvaluationComparison,
	getEvaluationComparisonData,
} from "@/modules/evaluation";

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ ids?: string | string[] }>;
};

export default async function AcResultsComparePage({
	params,
	searchParams,
}: Props) {
	const [{ id }, { ids }] = await Promise.all([params, searchParams]);
	const data = await getEvaluationComparisonData(
		id,
		Array.isArray(ids) ? ids.join(",") : ids,
	);

	return <EvaluationComparison acId={id} data={data} />;
}
