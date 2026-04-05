import { AcAssignmentsMatrix } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupAssignmentsPage({ params }: Props) {
	const { id } = await params;
	return <AcAssignmentsMatrix acId={id} />;
}
