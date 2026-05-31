export function normalizeCanonicalPath(pathname) {
  if (!pathname) {
    return "/";
  }

  const [pathPart, suffix = ""] = String(pathname).split(/([?#].*)/, 2);
  let normalizedPath = pathPart.trim() || "/";

  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }

  normalizedPath = normalizedPath.replace(/\/index\.html$/i, "/");
  normalizedPath = normalizedPath.replace(/\.html$/i, "");
  normalizedPath = normalizedPath.replace(/\/{2,}/g, "/");

  if (normalizedPath !== "/") {
    normalizedPath = normalizedPath.replace(/\/+$/, "");
  }

  return `${normalizedPath}${suffix}`;
}

export function createCanonicalUrl(pathname, siteUrl) {
  return new URL(normalizeCanonicalPath(pathname), siteUrl).toString();
}
