import { DashboardAcList } from "./dashboard-ac-list";
import { DashboardLayout } from "./dashboard-layout";

type Props = {
	userName: string;
	isAdmin: boolean;
};

function DashboardPage({ userName, isAdmin }: Props) {
	return (
		<DashboardLayout isAdmin={isAdmin} userName={userName}>
			<div className="mx-auto max-w-5xl">
				<h1 className="mb-6 font-semibold text-xl">Assessment Centers</h1>
				<DashboardAcList />
			</div>
		</DashboardLayout>
	);
}

export { DashboardPage };
