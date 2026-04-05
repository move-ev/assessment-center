import { AcGroupsEditor } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupGroupsPage({ params }: Props) {
	const { id } = await params;
	return <AcGroupsEditor acId={id} />;
}
