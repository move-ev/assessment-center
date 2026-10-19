"use client";

import { type ReactNode, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
	acName: string;
	title: string;
	description: ReactNode;
	triggerLabel: string;
	confirmLabel: string;
	pendingLabel: string;
	isPending: boolean;
	onConfirm: () => void;
};

/**
 * Confirmation for irreversible AC actions: the confirm button only enables
 * once the AC name has been typed exactly.
 */
function AcConfirmByNameDialog({
	acName,
	title,
	description,
	triggerLabel,
	confirmLabel,
	pendingLabel,
	isPending,
	onConfirm,
}: Props) {
	const [open, setOpen] = useState(false);
	const [typedName, setTypedName] = useState("");
	const nameMatches = typedName.trim() === acName.trim();

	return (
		<AlertDialog
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setTypedName("");
			}}
			open={open}
		>
			<AlertDialogTrigger render={<Button variant="destructive" />}>
				{triggerLabel}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription render={<div />}>
						{description}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<Field>
					<FieldLabel htmlFor="confirm-ac-name">
						Zur Bestätigung den Namen „{acName}“ eingeben
					</FieldLabel>
					<Input
						autoComplete="off"
						disabled={isPending}
						id="confirm-ac-name"
						onChange={(e) => setTypedName(e.target.value)}
						value={typedName}
					/>
				</Field>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
					<AlertDialogAction
						disabled={!nameMatches || isPending}
						onClick={onConfirm}
						variant="destructive"
					>
						{isPending ? pendingLabel : confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export { AcConfirmByNameDialog };
