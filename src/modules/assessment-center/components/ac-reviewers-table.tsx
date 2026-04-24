"use client";

import { SearchIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

type Props = {
	acId: string;
};

function AcReviewersTable({ acId }: Props) {
	const utils = api.useUtils();
	const { data: reviewers = [], isPending } = api.reviewer.listByAc.useQuery({
		acId,
	});

	const invalidate = () => utils.reviewer.listByAc.invalidate({ acId });

	const removeMutation = api.reviewer.remove.useMutation({
		onSuccess: async () => {
			await invalidate();
			toast.success("Bewerter entfernt");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-medium text-base">Bewerter</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Benutzer, die Bewerbende in diesem Assessment Center bewerten.
				</p>
			</div>

			{isPending ? (
				<ReviewersTableSkeleton />
			) : reviewers.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Noch keine Bewerter hinzugefügt.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>E-Mail</TableHead>
							<TableHead className="w-16" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{reviewers.map((reviewer) => (
							<TableRow key={reviewer.id}>
								<TableCell className="font-medium">
									{reviewer.user.name}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{reviewer.user.email}
								</TableCell>
								<TableCell>
									<div className="flex justify-end">
										<AlertDialog>
											<AlertDialogTrigger
												render={
													<Button
														aria-label="Bewerter entfernen"
														disabled={removeMutation.isPending}
														size="icon-sm"
														variant="ghost"
													>
														<Trash2Icon className="h-4 w-4" />
													</Button>
												}
											/>
											<AlertDialogContent size="sm">
												<AlertDialogHeader>
													<AlertDialogTitle>
														Bewerter entfernen?
													</AlertDialogTitle>
													<AlertDialogDescription>
														{reviewer.user.name} wird aus diesem Assessment
														Center entfernt. Alle zugehörigen Zuweisungen werden
														ebenfalls gelöscht.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Abbrechen</AlertDialogCancel>
													<AlertDialogAction
														onClick={() =>
															removeMutation.mutate({
																id: reviewer.id,
																acId,
															})
														}
														variant="destructive"
													>
														Entfernen
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<AddReviewerSearch acId={acId} utils={utils} />
		</div>
	);
}

type AddReviewerSearchProps = {
	acId: string;
	utils: ReturnType<typeof api.useUtils>;
};

function AddReviewerSearch({ acId, utils }: AddReviewerSearchProps) {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
		return () => clearTimeout(timer);
	}, [query]);

	const { data: users = [], isFetching } = api.reviewer.searchUsers.useQuery(
		{ acId, query: debouncedQuery },
		{ enabled: debouncedQuery.length >= 2 },
	);

	const addMutation = api.reviewer.add.useMutation({
		onSuccess: async () => {
			await utils.reviewer.listByAc.invalidate({ acId });
			setQuery("");
			setDebouncedQuery("");
			toast.success("Bewerter hinzugefügt");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-3">
			<p className="font-medium text-sm">Bewerter suchen</p>
			<div className="relative max-w-sm">
				<SearchIcon className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					className="pl-8"
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Name oder E-Mail…"
					type="search"
					value={query}
				/>
			</div>

			{debouncedQuery.length >= 2 && (
				<UserSearchResults
					isAdding={addMutation.isPending}
					isFetching={isFetching}
					onAdd={(userId) => addMutation.mutate({ acId, userId })}
					users={users}
				/>
			)}
		</div>
	);
}

type UserSearchResultsProps = {
	users: Array<{ id: string; name: string; email: string }>;
	isFetching: boolean;
	isAdding: boolean;
	onAdd: (userId: string) => void;
};

function UserSearchResults({
	users,
	isFetching,
	isAdding,
	onAdd,
}: UserSearchResultsProps) {
	if (isFetching) {
		return <p className="text-muted-foreground text-sm">Suche läuft…</p>;
	}

	if (users.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Keine passenden Benutzer gefunden.
			</p>
		);
	}

	return (
		<ul className="divide-y rounded-lg border">
			{users.map((user) => (
				<li
					className="flex items-center justify-between px-3 py-2"
					key={user.id}
				>
					<div className="min-w-0">
						<p className="font-medium text-sm">{user.name}</p>
						<p className="text-muted-foreground text-xs">{user.email}</p>
					</div>
					<Button
						disabled={isAdding}
						onClick={() => onAdd(user.id)}
						size="sm"
						type="button"
						variant="outline"
					>
						Hinzufügen
					</Button>
				</li>
			))}
		</ul>
	);
}

function ReviewersTableSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2].map((i) => (
				<div className="h-10 animate-pulse rounded bg-muted" key={i} />
			))}
		</div>
	);
}

export { AcReviewersTable };
