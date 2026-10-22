/** Longest free text a reviewer can save for one criterion. */
export const QUALITATIVE_TEXT_MAX_LENGTH = 10_000;

export type QualitativeWrite =
	| { kind: "SAVE"; text: string }
	| { kind: "DELETE" };

/**
 * What saving a free-text field does: free text is never required, so a
 * cleared field removes the entry instead of keeping the old text.
 */
export function getQualitativeWrite(rawText: string): QualitativeWrite {
	const text = rawText.trim();
	return text === "" ? { kind: "DELETE" } : { kind: "SAVE", text };
}
