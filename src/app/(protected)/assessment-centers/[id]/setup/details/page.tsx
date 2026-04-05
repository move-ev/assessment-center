import { AcDetailsForm } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupDetailsPage({ params }: Props) {
	const { id } = await params;
	return <AcDetailsForm acId={id} />;
}
