import { AcReviewersTable } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupReviewersPage({ params }: Props) {
	const { id } = await params;
	return <AcReviewersTable acId={id} />;
}
