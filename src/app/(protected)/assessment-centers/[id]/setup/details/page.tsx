import { AcDetailsPage } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupDetailsPage({ params }: Props) {
	const { id } = await params;
	return <AcDetailsPage acId={id} />;
}
