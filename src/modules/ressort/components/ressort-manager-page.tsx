"use client";

import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { api } from "@/trpc/react";

type Ressort = {
	id: string;
	name: string;
	_count: { capacities: number };
};

/** Admin page: the ressorts all ACs plan with. */
function RessortManagerPage() {
	const { data: ressorts, isLoading, isError } = api.ressort.list.useQuery();

	return (
		<main className="mx-auto max-w-2xl p-6">
			<Link
				className={buttonVariants({ variant: "ghost", size: "sm" })}
				href={ROUTES.dashboard()}
			>
				<ArrowLeftIcon />
				Dashboard
			</Link>
			<h1 className="mt-4 mb-1 font-semibold text-xl">Ressorts</h1>
			<p className="mb-6 text-muted-foreground text-sm">
				Gilt für alle Assessment Centers. Wie viele Leute je Ressort gemeldet,
				aktiv und aufzunehmen sind, tragt ihr in den Ergebnissen eines AC ein.
			</p>
			<RessortCreateForm />
			{isLoading && <p className="text-muted-foreground text-sm">Lädt…</p>}
			{isError && (
				<p className="text-destructive text-sm">
					Ressorts konnten nicht geladen werden. Bitte Seite neu laden.
				</p>
			)}
			{ressorts?.length === 0 && (
				<p className="text-muted-foreground text-sm">Noch keine Ressorts.</p>
			)}
			{ressorts && ressorts.length > 0 && (
				<ul aria-label="Ressorts" className="divide-y rounded-md border">
					{ressorts.map((ressort) => (
						<RessortRow key={ressort.id} ressort={ressort} />
					))}
				</ul>
			)}
		</main>
	);
}

function RessortCreateForm() {
	const utils = api.useUtils();
	const [name, setName] = useState("");
	const create = api.ressort.create.useMutation({
		onSuccess: async () => {
			setName("");
			await utils.ressort.list.invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		create.mutate({ name });
	};

	return (
		<form className="mb-6 flex gap-2" onSubmit={onSubmit}>
			<Input
				aria-label="Neues Ressort"
				maxLength={80}
				onChange={(event) => setName(event.target.value)}
				placeholder="Neues Ressort"
				value={name}
			/>
			<Button disabled={create.isPending || name.trim() === ""} type="submit">
				<PlusIcon />
				Hinzufügen
			</Button>
		</form>
	);
}

function RessortRow({ ressort }: { ressort: Ressort }) {
	const utils = api.useUtils();
	const [name, setName] = useState(ressort.name);
	const onError = (error: { message: string }) => toast.error(error.message);
	const rename = api.ressort.rename.useMutation({
		onSuccess: async () => {
			toast.success("Ressort umbenannt");
			await utils.ressort.list.invalidate();
		},
		onError,
	});
	const remove = api.ressort.remove.useMutation({
		onSuccess: () => utils.ressort.list.invalidate(),
		onError,
	});
	const isUsed = ressort._count.capacities > 0;
	const usedHintId = `ressort-used-${ressort.id}`;
	const changed = name.trim() !== "" && name.trim() !== ressort.name;

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		const trimmed = name.trim();
		setName(trimmed);
		rename.mutate({ id: ressort.id, name: trimmed });
	};

	return (
		<li className="flex items-center gap-2 p-2">
			<form className="flex flex-1 gap-2" onSubmit={onSubmit}>
				<Input
					aria-label={`Name von ${ressort.name}`}
					maxLength={80}
					onChange={(event) => setName(event.target.value)}
					value={name}
				/>
				<Button
					disabled={!changed || rename.isPending}
					type="submit"
					variant="outline"
				>
					Umbenennen
				</Button>
			</form>
			{isUsed && (
				<span className="text-muted-foreground text-xs" id={usedHintId}>
					In einem AC verwendet
				</span>
			)}
			<Button
				aria-describedby={isUsed ? usedHintId : undefined}
				aria-label={`${ressort.name} löschen`}
				// The server refuses too; this just saves a pointless click.
				disabled={isUsed || remove.isPending}
				onClick={() => remove.mutate({ id: ressort.id })}
				size="icon"
				variant="ghost"
			>
				<Trash2Icon />
			</Button>
		</li>
	);
}

export { RessortManagerPage };
