import assert from "node:assert/strict";
import test from "node:test";
import { rehypeMermaid } from "../src/plugins/rehype-mermaid.js";

test("rehypeMermaid converts Shiki mermaid blocks that expose dataLanguage on pre", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {
          dataLanguage: "mermaid",
          className: ["astro-code"],
        },
        children: [
          {
            type: "element",
            tagName: "code",
            properties: {},
            children: [
              {
                type: "text",
                value: "graph TD;\nA-->B;",
              },
            ],
          },
        ],
      },
    ],
  };

  rehypeMermaid()(tree);

  const preNode = tree.children[0];
  assert.deepEqual(preNode.properties, { className: ["mermaid"] });
  assert.equal(preNode.children[0].type, "text");
  assert.equal(preNode.children[0].value, "graph TD;\nA-->B;");
});
