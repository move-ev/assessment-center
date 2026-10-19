"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RATING_SCALE_MAXIMUMS, type RatingScaleMax } from "@/lib/rating-scale";
import { api } from "@/trpc/react";

type Props = {
	acId: string;
	ratingScaleMax: RatingScaleMax;
	isReadOnly: boolean;
	/** Once ratings exist the scale can no longer change. */
	hasRatings: boolean;
	utils: ReturnType<typeof api.useUtils>;
};

function AcRatingScaleSection({
	acId,
	ratingScaleMax,
	isReadOnly,
	hasRatings,
	utils,
}: Props) {
	const setScaleMutation = api.assessmentCenter.setRatingScale.useMutation({
		onSuccess: async () => {
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			toast.success("Bewertungsskala gespeichert");
		},
		onError: async (error) => {
			// The lock or rating state may have changed: show the current one.
			await utils.assessmentCenter.getDetails.invalidate({ id: acId });
			toast.error(error.message);
		},
	});

	return (
		<div className="space-y-3">
			<div>
				<h3 className="font-medium text-sm">Bewertungsskala</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					{getScaleHint(isReadOnly, hasRatings)}
				</p>
			</div>
			<div className="flex gap-2">
				{RATING_SCALE_MAXIMUMS.map((max) => (
					<Button
						aria-pressed={ratingScaleMax === max}
						disabled={isReadOnly || hasRatings || setScaleMutation.isPending}
						key={max}
						onClick={() => {
							if (max !== ratingScaleMax) {
								setScaleMutation.mutate({ id: acId, ratingScaleMax: max });
							}
						}}
						type="button"
						variant={ratingScaleMax === max ? "default" : "outline"}
					>
						1–{max} Sterne
					</Button>
				))}
			</div>
		</div>
	);
}

function getScaleHint(isReadOnly: boolean, hasRatings: boolean): string {
	if (isReadOnly) {
		return "Abgeschlossene oder anonymisierte ACs können nicht mehr geändert werden.";
	}

	return hasRatings
		? "Es liegen bereits Bewertungen vor, deshalb ist die Skala fest."
		: "Kann geändert werden, solange noch niemand bewertet hat.";
}

export { AcRatingScaleSection };
