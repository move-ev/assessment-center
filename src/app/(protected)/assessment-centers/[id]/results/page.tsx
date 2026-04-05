import { notFound } from "next/navigation";
import {
	EvaluationParticipant,
	getEvaluationResultsData,
} from "@/modules/evaluation";
import { db } from "@/server/db";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcResultsPage({ params }: Props) {
	const { id } = await params;
	const [results, assessmentCenter] = await Promise.all([
		getEvaluationResultsData(id),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { name: true },
		}),
	]);

	if (!assessmentCenter) {
		notFound();
	}

	return (
		<EvaluationParticipant
			acId={id}
			acName={assessmentCenter.name}
			results={results}
		/>
	);
}
