type Props = {
	acId: string;
};

function AcDetailsPage({ acId }: Props) {
	return (
		<main className="flex min-h-screen items-center justify-center">
			<p className="text-muted-foreground text-sm">
				Setup details for AC {acId} – coming soon
			</p>
		</main>
	);
}

export { AcDetailsPage };
