import type { Element, ElementContent, Root } from "hast";

/**
 * Rehype plugin that wraps each h1 and all nodes following it (until the next h1)
 * into a <details><summary> pair, making h1 sections collapsible by default.
 */
export function rehypeCollapsibleH1() {
	return (tree: Root) => {
		const result: ElementContent[] = [];
		let current: Element | null = null;

		for (const node of tree.children) {
			if (node.type === "element" && node.tagName === "h1") {
				current = {
					type: "element",
					tagName: "details",
					properties: {},
					children: [
						{
							type: "element",
							tagName: "summary",
							properties: {},
							children: node.children,
						},
					],
				};
				result.push(current);
			} else if (current) {
				current.children.push(node as ElementContent);
			} else {
				result.push(node as ElementContent);
			}
		}

		tree.children = result;
	};
}
