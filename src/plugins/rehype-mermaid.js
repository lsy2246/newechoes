import { visit } from "unist-util-visit";

function hasClassName(node, className) {
  const classNames = node?.properties?.className;
  return Array.isArray(classNames) && classNames.includes(className);
}

function isMermaidLanguage(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "mermaid";
}

function isMermaidCodeBlock(preNode, codeNode) {
  if (hasClassName(codeNode, "language-mermaid")) {
    return true;
  }

  return isMermaidLanguage(preNode?.properties?.dataLanguage)
    || isMermaidLanguage(preNode?.properties?.["data-language"])
    || isMermaidLanguage(codeNode?.properties?.dataLanguage)
    || isMermaidLanguage(codeNode?.properties?.["data-language"]);
}

function extractCodeText(node) {
  if (!node) return "";

  if (node.type === "text") {
    return node.value || "";
  }

  if (node.type !== "element" || !Array.isArray(node.children)) {
    return "";
  }

  const content = node.children.map(extractCodeText).join("");

  return hasClassName(node, "line") ? `${content}\n` : content;
}

export function rehypeMermaid() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (
        node.tagName !== "pre" ||
        node.children?.length !== 1 ||
        node.children[0]?.tagName !== "code"
      ) {
        return;
      }

      const codeNode = node.children[0];
      if (!isMermaidCodeBlock(node, codeNode)) {
        return;
      }

      const diagramDefinition = extractCodeText(codeNode).replace(/\n$/, "");
      if (!diagramDefinition.trim()) {
        return;
      }

      node.properties = {
        className: ["mermaid"],
      };
      node.children = [
        {
          type: "text",
          value: diagramDefinition,
        },
      ];
    });
  };
}
