import { AcScheduleBuilder } from "@/modules/assessment-center";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function AcSetupSchedulePage({ params }: Props) {
	const { id } = await params;
	return <AcScheduleBuilder acId={id} />;
}
