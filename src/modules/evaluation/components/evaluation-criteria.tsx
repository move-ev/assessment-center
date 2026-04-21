import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";

type Props = {
	criteria: EvaluationResultsData["criteria"];
};

function EvaluationCriteria({ criteria }: Props) {
	if (criteria.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Es wurden noch keine Kriterien für die Auswertung angelegt.
			</p>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Aufgabe</TableHead>
					<TableHead>Gruppe</TableHead>
					<TableHead>Kriterium</TableHead>
					<TableHead>Typ</TableHead>
					<TableHead>Gewicht</TableHead>
					<TableHead>Durchschnitt</TableHead>
					<TableHead>Anzahl Ratings</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{criteria.map((criterion) => (
					<TableRow key={criterion.id}>
						<TableCell className="font-medium">{criterion.taskName}</TableCell>
						<TableCell>
							<div className="space-y-1">
								<p>{criterion.criteriaGroupTitle}</p>
								<Badge
									variant={
										criterion.criteriaGroupFactorType === "POTENTIAL"
											? "secondary"
											: "outline"
									}
								>
									{criterion.criteriaGroupFactorType === "POTENTIAL"
										? "Potenzial"
										: "Kompetenz"}
								</Badge>
							</div>
						</TableCell>
						<TableCell>{criterion.name}</TableCell>
						<TableCell>
							<Badge
								variant={
									criterion.type === "QUANTITATIVE" ? "secondary" : "outline"
								}
							>
								{criterion.type === "QUANTITATIVE"
									? "Quantitativ"
									: "Qualitativ"}
							</Badge>
						</TableCell>
						<TableCell className="text-muted-foreground">
							{criterion.weight === null ? "–" : criterion.weight.toFixed(2)}
						</TableCell>
						<TableCell>
							{criterion.averageScore === null
								? "n/a"
								: criterion.averageScore.toFixed(2)}
						</TableCell>
						<TableCell className="text-muted-foreground">
							{criterion.type === "QUANTITATIVE"
								? criterion.ratingCount
								: criterion.textEntryCount}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export { EvaluationCriteria };
