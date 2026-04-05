import { AcTasksTable } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupTasksPage({ params }: Props) {
	const { id } = await params;
	return <AcTasksTable acId={id} />;
}
