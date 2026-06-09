import { normalizeCanonicalPath } from "./canonical-url.js";

const EXCLUDED_SITEMAP_PATHS = new Set([
  "/404",
  "/global-graph-modal-fragment",
]);

export function shouldIncludeSitemapPage(page) {
  const pathname = normalizeCanonicalPath(
    typeof page === "string" ? page : page?.pathname,
  );

  if (EXCLUDED_SITEMAP_PATHS.has(pathname)) {
    return false;
  }

  return pathname !== "/api" && !pathname.startsWith("/api/");
}
