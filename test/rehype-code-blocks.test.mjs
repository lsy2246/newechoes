import assert from "node:assert/strict";
import test from "node:test";
import { rehypeCodeBlocks } from "../src/plugins/rehype-code-blocks.js";

function findFirst(node, predicate) {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    const match = findFirst(child, predicate);
    if (match) {
      return match;
    }
  }

  return null;
}

function textContent(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  if (node.type === "text") {
    return node.value || "";
  }

  return (node.children || []).map(textContent).join("");
}

test("rehypeCodeBlocks renders a collapsed details code block with summary controls", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {
          dataLanguage: "cpp",
          className: ["astro-code"],
          style: "background-color:#fff;",
        },
        children: [
          {
            type: "element",
            tagName: "code",
            properties: {
              className: ["language-cpp"],
            },
            children: [
              {
                type: "text",
                value: "pair<int, int> p;\np = {3, 4};",
              },
            ],
          },
        ],
      },
    ],
  };

  rehypeCodeBlocks()(tree);

  const container = tree.children[0];
  assert.equal(container.tagName, "details");
  assert.deepEqual(container.properties.className, ["code-block-container", "astro-code-container"]);
  assert.equal(container.properties.open, undefined);
  assert.equal(container.properties["data-lines"], "2");

  const header = findFirst(
    container,
    (node) => node.type === "element" && node.properties?.className?.includes("code-block-header"),
  );
  assert.equal(header, null);

  const summary = findFirst(
    container,
    (node) => node.type === "element" && node.properties?.className?.includes("code-block-summary"),
  );
  assert.ok(summary);
  assert.equal(summary.tagName, "summary");
  assert.match(textContent(summary), /CPP/);
  assert.match(textContent(summary), /2 行/);
  assert.match(textContent(summary), /展开/);
  assert.match(textContent(summary), /收起/);
  assert.deepEqual(container.children.map((child) => child.tagName), ["summary", "div"]);

  const content = findFirst(
    container,
    (node) => node.type === "element" && node.properties?.className?.includes("code-block-content"),
  );
  assert.ok(content);

  const copyButton = findFirst(
    container,
    (node) => node.type === "element" && node.properties?.className?.includes("code-block-copy"),
  );
  assert.ok(copyButton);
  assert.equal(
    summary.children.find(
      (node) => node.type === "element" && node.properties?.className?.includes("code-block-copy"),
    ),
    copyButton,
  );
  assert.equal(copyButton.tagName, "button");
  assert.equal(copyButton.properties["aria-label"], "复制代码");
  assert.equal(copyButton.properties.type, "button");
  assert.ok(copyButton.properties["data-code"]);

  const lineNumbers = findFirst(
    content,
    (node) => node.type === "element" && node.properties?.className?.includes("line-numbers-container"),
  );
  assert.ok(lineNumbers);
  assert.equal(lineNumbers.tagName, "nav");

  const language = findFirst(
    lineNumbers,
    (node) => node.type === "element" && node.properties?.className?.includes("code-block-lang"),
  );
  assert.equal(language, null);
  assert.equal(lineNumbers.children.length, 2);

  const preNode = findFirst(
    content,
    (node) => node.type === "element" && node.tagName === "pre",
  );
  assert.ok(preNode);
  assert.ok(preNode.properties.className.includes("line-numbers"));
  assert.equal(preNode.children[0].tagName, "code");
});
