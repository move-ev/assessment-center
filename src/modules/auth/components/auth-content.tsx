import { AuthMicrosoftLogin } from "./auth-microsoft-login";

function AuthContent() {
	return (
		<div className="w-full max-w-md">
			<div className="grid gap-1.5">
				<h1 className="font-medium text-foreground text-lg">
					Willkommen zurück!
				</h1>
				<p className="text-muted-foreground text-sm">
					Bitte melde dich mit deinem Microsoft Account an um fortzufahren
				</p>
			</div>
			<div className="mt-8 grid grid-cols-1 gap-4">
				<AuthMicrosoftLogin />
			</div>
		</div>
	);
}

export { AuthContent };
