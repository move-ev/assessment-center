"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";

type Props = {
	checked: boolean;
	disabled: boolean;
	onCheckedChange: (checked: boolean) => void;
};

function DemoField({ checked, disabled, onCheckedChange }: Props) {
	return (
		<Field orientation="horizontal">
			<Checkbox
				checked={checked}
				disabled={disabled}
				id="ac-is-demo"
				onCheckedChange={onCheckedChange}
			/>
			<FieldLabel htmlFor="ac-is-demo">
				Demo-AC{" "}
				<span className="font-normal text-muted-foreground">
					(wird in Jahrgangsvergleichen nicht berücksichtigt)
				</span>
			</FieldLabel>
		</Field>
	);
}

export { DemoField };
