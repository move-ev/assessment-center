"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EvaluationResultsData } from "../server/get-evaluation-results-data";

type Props = {
	acName: string;
	rows: EvaluationResultsData["exportRows"];
};

function EvaluationExport({ acName, rows }: Props) {
	const csvContent = useMemo(() => buildCsv(rows), [rows]);

	return (
		<Card>
			<CardHeader className="gap-2">
				<CardTitle>Export</CardTitle>
				<p className="text-muted-foreground text-sm">
					CSV-Export der Teilnehmerauswertung mit Gesamtwerten und
					Aufgaben-Scores.
				</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="space-y-1 text-sm">
					<p>{rows.length} Teilnehmerzeilen verfügbar</p>
					<p className="text-muted-foreground">
						Dateiname: {toFileName(acName)}
					</p>
				</div>
				<Button onClick={() => downloadCsv(csvContent, acName)}>
					<Download />
					CSV herunterladen
				</Button>
			</CardContent>
		</Card>
	);
}

function buildCsv(rows: EvaluationResultsData["exportRows"]) {
	if (rows.length === 0) {
		return "";
	}

	const firstRow = rows[0];
	if (!firstRow) {
		return "";
	}

	const headers = Object.keys(firstRow);
	const lines = [
		headers.join(";"),
		...rows.map((row) =>
			headers.map((header) => escapeCsvValue(row[header] ?? "")).join(";"),
		),
	];

	return lines.join("\n");
}

function escapeCsvValue(value: string) {
	const escapedValue = value.replaceAll('"', '""');
	return `"${escapedValue}"`;
}

function toFileName(acName: string) {
	return `${acName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-results.csv`;
}

function downloadCsv(csvContent: string, acName: string) {
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = toFileName(acName);
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export { EvaluationExport };
