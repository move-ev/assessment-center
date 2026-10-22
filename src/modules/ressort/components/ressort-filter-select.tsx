"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import {
	type RessortFilter,
	toRessortFilterValue,
	UNASSIGNED_FILTER_VALUE,
} from "@/lib/ressort-assignment";

type Props = {
	ressorts: Array<{ ressortId: string; name: string }>;
	filter: RessortFilter;
};

const ALL = "";

/** Narrows the ranking to one ressort or to unassigned people via `?ressort=`. */
function RessortFilterSelect({ ressorts, filter }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const onChange = (next: string) => {
		const params = new URLSearchParams(searchParams);
		if (next === ALL) {
			params.delete("ressort");
		} else {
			params.set("ressort", next);
		}
		const query = params.toString();
		router.replace(query ? `${pathname}?${query}` : pathname, {
			scroll: false,
		});
	};

	return (
		<NativeSelect
			aria-label="Nach Ressort filtern"
			onChange={(event) => onChange(event.target.value)}
			size="sm"
			value={toRessortFilterValue(filter)}
		>
			<NativeSelectOption value={ALL}>Alle Ressorts</NativeSelectOption>
			<NativeSelectOption value={UNASSIGNED_FILTER_VALUE}>
				Nicht zugeteilt
			</NativeSelectOption>
			{ressorts.map((ressort) => (
				<NativeSelectOption key={ressort.ressortId} value={ressort.ressortId}>
					{ressort.name}
				</NativeSelectOption>
			))}
		</NativeSelect>
	);
}

export { RessortFilterSelect };
