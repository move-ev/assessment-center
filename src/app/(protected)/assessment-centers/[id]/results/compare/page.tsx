import {
	EvaluationComparison,
	getEvaluationComparisonData,
} from "@/modules/evaluation";
import { requireResultsAccess } from "@/server/ac-role";

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ ids?: string | string[] }>;
};

export default async function AcResultsComparePage({
	params,
	searchParams,
}: Props) {
	const [{ id }, { ids }] = await Promise.all([params, searchParams]);
	await requireResultsAccess(id);
	const data = await getEvaluationComparisonData(id, ids);

	return <EvaluationComparison acId={id} data={data} />;
}
