const ARTICLE_ROUTE_SLUG_STRIP_RE = /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g;

function slugPathSegment(segment) {
  return String(segment)
    .trim()
    .toLowerCase()
    .replace(ARTICLE_ROUTE_SLUG_STRIP_RE, "")
    .replace(/\s+/g, "-");
}

export function createArticleRouteId(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/i, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => slugPathSegment(segment))
    .join("/")
    .replace(/\/index$/i, "");
}
