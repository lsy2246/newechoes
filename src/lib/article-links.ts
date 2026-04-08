import { getSpecialPath } from "@/content.config";

const MARKDOWN_LINK_RE = /(?<!!)\[[^\]]*]\(([^)]+)\)/g;
const HTML_HREF_RE = /href\s*=\s*["']([^"']+)["']/g;
const SKIPPED_PREFIXES = [
  "#",
  "http://",
  "https://",
  "//",
  "mailto:",
  "tel:",
  "javascript:",
  "data:",
];

function stripMarkdownTitle(target: string) {
  const trimmed = target.trim().replace(/^<|>$/g, "");
  const titleMatch = trimmed.match(/^(\S+)\s+["'(].*$/);
  return titleMatch ? titleMatch[1] : trimmed;
}

export function normalizeArticleReferenceTarget(target: string): string | null {
  if (!target) return null;

  let normalized = stripMarkdownTitle(target);
  if (!normalized) return null;

  const lowerTarget = normalized.toLowerCase();
  if (SKIPPED_PREFIXES.some((prefix) => lowerTarget.startsWith(prefix))) {
    return null;
  }

  try {
    normalized = decodeURI(normalized);
  } catch {
    // Ignore malformed URI segments and keep the original text.
  }

  normalized = normalized.split("#")[0]?.split("?")[0]?.trim() ?? "";
  normalized = normalized.replace(/\/+$/, "");

  if (!normalized) return null;

  if (normalized.startsWith("/articles/")) {
    normalized = normalized.slice("/articles/".length);
  } else if (normalized.startsWith("articles/")) {
    normalized = normalized.slice("articles/".length);
  } else if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }

  normalized = normalized.replace(/^\.\//, "");
  while (normalized.startsWith("../")) {
    normalized = normalized.slice(3);
  }

  return normalized || null;
}

export function getArticleRouteVariants(articleId: string): string[] {
  const variants = new Set<string>();

  for (const path of [articleId, getSpecialPath(articleId)]) {
    for (const candidate of [path, encodeURI(path)]) {
      variants.add(candidate);
      variants.add(`/${candidate}`);
      variants.add(`articles/${candidate}`);
      variants.add(`/articles/${candidate}`);
    }
  }

  return [...variants];
}

export function getCanonicalArticleUrl(articleId: string) {
  return `/articles/${encodeURI(getSpecialPath(articleId))}`;
}

export function createArticleReferenceResolver(articleIds: Iterable<string>) {
  const routeMap = new Map<string, string>();

  for (const articleId of articleIds) {
    for (const variant of getArticleRouteVariants(articleId)) {
      const normalized = normalizeArticleReferenceTarget(variant);
      if (normalized) {
        routeMap.set(normalized, articleId);
      }
    }
  }

  return (href: string) => {
    const normalized = normalizeArticleReferenceTarget(href);
    if (!normalized) return null;
    return routeMap.get(normalized) ?? null;
  };
}

function extractReferenceTargets(rawContent: string) {
  const targets: string[] = [];

  for (const match of rawContent.matchAll(MARKDOWN_LINK_RE)) {
    const target = match[1]?.trim();
    if (target) {
      targets.push(target);
    }
  }

  for (const match of rawContent.matchAll(HTML_HREF_RE)) {
    const target = match[1]?.trim();
    if (target) {
      targets.push(target);
    }
  }

  return targets;
}

export function extractArticleReferences(
  rawContent: string,
  resolveArticleReference: (href: string) => string | null,
) {
  const references = new Set<string>();

  for (const target of extractReferenceTargets(rawContent)) {
    const articleId = resolveArticleReference(target);
    if (articleId) {
      references.add(articleId);
    }
  }

  return references;
}
