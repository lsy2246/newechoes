import { visit } from "unist-util-visit";
import {
  createArticleReferenceResolver,
  getCanonicalArticleUrl,
} from "../lib/article-links.ts";

export function rehypeArticleLinks({ articles = [] } = {}) {
  const resolveArticleReference = createArticleReferenceResolver(articles);

  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "a") {
        return;
      }

      const href = typeof node.properties?.href === "string"
        ? node.properties.href
        : "";
      if (!href) {
        return;
      }

      const articleId = resolveArticleReference(href);
      if (!articleId) {
        return;
      }

      const hashIndex = href.indexOf("#");
      const hashSuffix = hashIndex >= 0 ? href.slice(hashIndex) : "";
      node.properties.href = `${getCanonicalArticleUrl(articleId)}${hashSuffix}`;
      node.properties["data-astro-prefetch"] ??= "viewport";
    });
  };
}
