"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";
import { api } from "@/trpc/react";

function AcCreateForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const createMutation = api.assessmentCenter.create.useMutation({
		onSuccess: (data) => {
			toast.success("Assessment Center erstellt");
			router.push(ROUTES.acSetupDetails(data.id));
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		createMutation.mutate({
			name,
			description: description.trim() !== "" ? description : undefined,
		});
	}

	const zodFieldErrors = createMutation.error?.data?.zodError?.fieldErrors as
		| Record<string, string[]>
		| undefined;
	const nameErrors = zodFieldErrors?.name?.map((message) => ({ message }));

	return (
		<div className="w-full max-w-md">
			<div className="grid gap-1.5">
				<h1 className="font-medium text-foreground text-lg">
					Neues Assessment Center
				</h1>
				<p className="text-muted-foreground text-sm">
					Gib einen Namen ein und starte die Einrichtung deines Assessment
					Centers.
				</p>
			</div>

			<form className="mt-8" onSubmit={handleSubmit}>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="ac-name">Name</FieldLabel>
						<Input
							aria-invalid={!!nameErrors?.length}
							disabled={createMutation.isPending}
							id="ac-name"
							onChange={(e) => setName(e.target.value)}
							placeholder="z. B. AC Führungskräfte Q2 2026"
							required
							value={name}
						/>
						{nameErrors && <FieldError errors={nameErrors} />}
					</Field>

					<Field>
						<FieldLabel htmlFor="ac-description">
							Beschreibung{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</FieldLabel>
						<Textarea
							disabled={createMutation.isPending}
							id="ac-description"
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optionale Beschreibung"
							value={description}
						/>
					</Field>
				</FieldGroup>

				<div className="mt-6">
					<Button
						disabled={createMutation.isPending || name.trim() === ""}
						type="submit"
					>
						{createMutation.isPending
							? "Erstelle..."
							: "Assessment Center erstellen"}
					</Button>
				</div>
			</form>
		</div>
	);
}

export { AcCreateForm };
