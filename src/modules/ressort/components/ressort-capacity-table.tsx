"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { sortByRank } from "@/lib/ressort-assignment";
import {
	CAPACITY_MAX,
	getCapacityError,
	type RessortCapacity,
} from "@/lib/ressort-capacity";
import { ROUTES } from "@/lib/routes";
import { api } from "@/trpc/react";
import type { RessortCapacityRow } from "../server/get-ressort-capacities";

type Props = {
	acId: string;
	rows: RessortCapacityRow[];
	/** Admins enter the numbers; everyone else only reads them. */
	canManage: boolean;
	/** Rank in the ranking per person, to list assigned people in rank order. */
	ranks: Record<string, number | null>;
};

const CAPACITY_FIELDS = [
	{ key: "registered", label: "Gemeldet" },
	{ key: "active", label: "Aktiv" },
	{ key: "toAdmit", label: "Aufzunehmen" },
] as const;

function RessortCapacityTable({ acId, rows, canManage, ranks }: Props) {
	if (rows.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Noch keine Ressorts angelegt.
				{canManage &&
					" Admins legen sie über das Dashboard unter „Ressorts“ an."}
			</p>
		);
	}

	return (
		<Table aria-label="Ressorts">
			<TableHeader>
				<TableRow>
					<TableHead>Ressort</TableHead>
					{CAPACITY_FIELDS.map((field) => (
						<TableHead className="text-right" key={field.key}>
							{field.label}
						</TableHead>
					))}
					<TableHead className="text-right">Zugeteilt</TableHead>
					<TableHead className="text-right">Noch frei</TableHead>
					{canManage && <TableHead className="sr-only">Speichern</TableHead>}
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) =>
					canManage ? (
						<EditableRow
							acId={acId}
							key={row.ressortId}
							ranks={ranks}
							row={row}
						/>
					) : (
						<ReadOnlyRow
							acId={acId}
							key={row.ressortId}
							ranks={ranks}
							row={row}
						/>
					),
				)}
			</TableBody>
		</Table>
	);
}

type RowProps = {
	acId: string;
	row: RessortCapacityRow;
	ranks: Props["ranks"];
};

function ReadOnlyRow({ acId, row, ranks }: RowProps) {
	return (
		<TableRow>
			<TableCell className="align-top font-medium">
				{row.name}
				<AssignedPeople acId={acId} ranks={ranks} row={row} />
			</TableCell>
			{CAPACITY_FIELDS.map((field) => (
				<TableCell className="text-right tabular-nums" key={field.key}>
					{row.capacity ? row.capacity[field.key] : "–"}
				</TableCell>
			))}
			<SlotCells row={row} />
		</TableRow>
	);
}

type Draft = Record<keyof RessortCapacity, string>;

function toDraft(capacity: RessortCapacity | null): Draft {
	return {
		registered: String(capacity?.registered ?? ""),
		active: String(capacity?.active ?? ""),
		toAdmit: String(capacity?.toAdmit ?? ""),
	};
}

/** Empty or non-numeric text becomes NaN, which getCapacityError rejects. */
function parseDraft(draft: Draft): RessortCapacity {
	const parse = (text: string) =>
		text.trim() === "" ? Number.NaN : Number(text);
	return {
		registered: parse(draft.registered),
		active: parse(draft.active),
		toAdmit: parse(draft.toAdmit),
	};
}

function EditableRow({ acId, row, ranks }: RowProps) {
	const router = useRouter();
	const [draft, setDraft] = useState(() => toDraft(row.capacity));
	const [error, setError] = useState<string | null>(null);
	const save = api.ressort.setCapacity.useMutation({
		onSuccess: () => {
			toast.success(`${row.name} gespeichert`);
			router.refresh();
		},
		onError: (mutationError) => setError(mutationError.message),
	});
	const formId = `ressort-capacity-${row.ressortId}`;

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		const capacity = parseDraft(draft);
		const validationError = getCapacityError(capacity);
		setError(validationError);
		if (!validationError) {
			save.mutate({ acId, ressortId: row.ressortId, ...capacity });
		}
	};

	return (
		<TableRow>
			<TableCell className="align-top font-medium">
				{row.name}
				<AssignedPeople acId={acId} ranks={ranks} row={row} />
				{error && (
					<p className="font-normal text-destructive text-xs" role="alert">
						{error}
					</p>
				)}
			</TableCell>
			{CAPACITY_FIELDS.map((field) => (
				<TableCell className="text-right" key={field.key}>
					<Input
						aria-label={`${field.label} ${row.name}`}
						className="ml-auto w-20 text-right"
						form={formId}
						inputMode="numeric"
						max={CAPACITY_MAX}
						min={0}
						onChange={(event) =>
							setDraft({ ...draft, [field.key]: event.target.value })
						}
						step={1}
						type="number"
						value={draft[field.key]}
					/>
				</TableCell>
			))}
			<SlotCells row={row} />
			<TableCell>
				<form id={formId} onSubmit={onSubmit}>
					<Button
						disabled={save.isPending}
						size="sm"
						type="submit"
						variant="outline"
					>
						Speichern
					</Button>
				</form>
			</TableCell>
		</TableRow>
	);
}

/** The people assigned to the ressort, best rank first. */
function AssignedPeople({ acId, row, ranks }: RowProps) {
	if (row.people.length === 0) return null;
	const byRank = sortByRank(row.people, ranks);
	return (
		<ul
			aria-label={`Zugeteilt zu ${row.name}`}
			className="mt-1 space-y-0.5 font-normal text-muted-foreground text-xs"
		>
			{byRank.map((person) => (
				<li key={person.id}>
					<Link
						className="underline-offset-4 hover:underline"
						href={ROUTES.acResultsParticipant(acId, person.id)}
					>
						{ranks[person.id] ? `${ranks[person.id]}. ` : ""}
						{person.name}
					</Link>
				</li>
			))}
		</ul>
	);
}

function SlotCells({ row }: { row: RessortCapacityRow }) {
	const { freeSlots, overBy, label } = row.slots;
	return (
		<>
			<TableCell className="text-right align-top tabular-nums">
				{row.people.length}
			</TableCell>
			<TableCell
				className={`text-right align-top tabular-nums ${overBy > 0 ? "font-medium text-destructive" : ""}`}
			>
				{freeSlots ?? "–"}
				{overBy > 0 && <p className="text-xs">{label}</p>}
			</TableCell>
		</>
	);
}

export { RessortCapacityTable };
