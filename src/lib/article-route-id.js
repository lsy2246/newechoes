import { slug as githubSlug } from "github-slugger";

export function createArticleRouteId(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/i, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => githubSlug(segment))
    .join("/")
    .replace(/\/index$/i, "");
}
