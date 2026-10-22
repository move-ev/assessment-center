import { notFound } from "next/navigation";
import { getResultsAccess } from "@/lib/results-access";
import {
	EvaluationParticipant,
	getEvaluationResultsData,
} from "@/modules/evaluation";
import { getAcRole } from "@/server/ac-role";
import { db } from "@/server/db";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcResultsPage({ params }: Props) {
	const { id } = await params;
	const [results, assessmentCenter, role] = await Promise.all([
		getEvaluationResultsData(id),
		db.assessmentCenter.findFirst({
			where: { id, deletedAt: null },
			select: { name: true, status: true },
		}),
		getAcRole(id),
	]);

	if (!assessmentCenter) {
		notFound();
	}

	return (
		<EvaluationParticipant
			acId={id}
			acName={assessmentCenter.name}
			canManage={getResultsAccess(role, assessmentCenter.status).canManage}
			results={results}
		/>
	);
}
