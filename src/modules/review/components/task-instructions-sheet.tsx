"use client";

import { BookOpenIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

type Props = {
	taskName: string;
	children: React.ReactNode;
};

function TaskInstructionsSheet({ taskName, children }: Props) {
	const [open, setOpen] = useState(false);

	return (
		<Sheet onOpenChange={setOpen} open={open}>
			<Button
				aria-label="Aufgabenanweisungen öffnen"
				className="fixed right-6 bottom-6 z-40 size-14 rounded-full shadow-lg"
				onClick={() => setOpen(true)}
				size="icon"
				type="button"
			>
				<BookOpenIcon className="size-6" />
			</Button>
			<SheetContent className={"data-[side=right]:sm:max-w-4xl"} side="right">
				<SheetHeader>
					<SheetTitle>{taskName}</SheetTitle>
				</SheetHeader>
				<div className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto px-6 pb-6">
					{children}
				</div>
			</SheetContent>
		</Sheet>
	);
}

export { TaskInstructionsSheet };
