import { AcParticipantsTable } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupParticipantsPage({ params }: Props) {
	const { id } = await params;
	return <AcParticipantsTable acId={id} />;
}
