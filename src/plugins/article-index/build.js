import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { buildSearchIndex } from "./indexing/search/build-search-index.js";
import { buildFilterIndex } from "./indexing/filter/build-filter-index.js";

const NON_CONTENT_SELECTORS = [
  "script",
  "style",
  "head",
  "meta",
  "link",
  "header",
  "footer",
  "nav",
  "aside",
  "noscript",
  "iframe",
  "svg",
  "button",
  "input",
  "form",
  "select",
  "option",
  "textarea",
  "template",
  "dialog",
  "canvas",
  ".sr-only",
  "[class*='sr-only']",
].join(", ");

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function walkHtmlFiles(rootDir) {
  const results = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const targetPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(targetPath);
        continue;
      }

      if (entry.isFile() && targetPath.endsWith(".html")) {
        results.push(targetPath);
      }
    }
  }

  return results;
}

function extractMetaMap($) {
  const meta = new Map();

  $("meta").each((_, element) => {
    const key = $(element).attr("property") || $(element).attr("name");
    const content = $(element).attr("content");

    if (!key || !content) {
      return;
    }

    const normalizedKey = key.trim();
    const existing = meta.get(normalizedKey);
    if (typeof existing === "string") {
      meta.set(normalizedKey, [existing, content]);
      return;
    }

    if (Array.isArray(existing)) {
      existing.push(content);
      return;
    }

    meta.set(normalizedKey, content);
  });

  return meta;
}

function getMetaValues(meta, key) {
  const value = meta.get(key);
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getFirstMetaValue(meta, key) {
  return getMetaValues(meta, key)[0] || "";
}

function resolvePageType(meta, html) {
  const ogType = getFirstMetaValue(meta, "og:type").trim();
  if (ogType) {
    return ogType;
  }

  if (html.includes('property="og:type"') && html.includes('content="article"')) {
    return "article";
  }

  if (html.includes('property="og:type"') && html.includes('content="page"')) {
    return "page";
  }

  if (html.includes('property="og:type"') && html.includes('content="directory"')) {
    return "directory";
  }

  return "unknown";
}

function shouldSkipFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
  return (
    normalizedPath.endsWith("/404.html")
    || normalizedPath.includes("/search/")
    || normalizedPath.endsWith("/robots.txt")
    || normalizedPath.endsWith("/sitemap.xml")
  );
}

function createContentRoot($) {
  const articleRoot = $("article").first();
  if (articleRoot.length > 0) {
    return articleRoot;
  }

  const mainRoot = $("main").first();
  if (mainRoot.length > 0) {
    return mainRoot;
  }

  return $("body").first();
}

function cleanContentRoot($, root) {
  const clone = root.clone();
  clone.find(NON_CONTENT_SELECTORS).remove();
  clone.find("section").each((_, element) => {
    const node = $(element);
    const identifier = `${node.attr("id") || ""} ${node.attr("class") || ""}`.toLowerCase();
    if (identifier.includes("toc") || identifier.includes("directory")) {
      node.remove();
    }
  });

  clone.find("[id], [class]").each((_, element) => {
    const node = $(element);
    const identifier = `${node.attr("id") || ""} ${node.attr("class") || ""}`.toLowerCase();
    if (
      identifier.includes("nav")
      || identifier.includes("menu")
      || identifier.includes("sidebar")
      || identifier.includes("comment")
      || identifier.includes("related")
      || identifier.includes("share")
      || identifier.includes("toc")
      || identifier.includes("directory")
    ) {
      node.remove();
    }
  });

  return clone;
}

function extractHeadings($, root, content) {
  const headings = [];
  const seen = new Set();

  root.find("h1, h2, h3, h4, h5, h6").each((_, element) => {
    const text = normalizeWhitespace($(element).text());
    if (!text || seen.has(text)) {
      return;
    }

    const tagName = element.tagName?.toLowerCase() || "h1";
    const level = Number.parseInt(tagName.slice(1), 10);
    if (!Number.isFinite(level) || level < 1 || level > 6) {
      return;
    }

    seen.add(text);
    headings.push({
      level,
      text,
      position: 0,
      end_position: content.length,
    });
  });

  const normalizedContent = content.toLowerCase();
  let lastPosition = 0;

  headings.forEach((heading) => {
    const normalizedHeading = heading.text.toLowerCase();
    const nextPosition = normalizedContent.indexOf(normalizedHeading, lastPosition);
    if (nextPosition !== -1) {
      heading.position = nextPosition;
      lastPosition = nextPosition + normalizedHeading.length;
    }
  });

  headings.forEach((heading, index) => {
    const nextHeading = headings[index + 1];
    heading.end_position = nextHeading ? nextHeading.position : content.length;
  });

  return headings;
}

function toIsoString(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isNaN(timestamp)
    ? new Date().toISOString()
    : new Date(timestamp).toISOString();
}

function buildArticleRecord(filePath, baseDir, html, indexAll) {
  if (shouldSkipFile(filePath)) {
    return null;
  }

  const $ = cheerio.load(html);
  const meta = extractMetaMap($);
  const pageType = resolvePageType(meta, html);
  const shouldProcess = indexAll
    ? pageType === "article" || pageType === "page"
    : pageType === "article";

  if (!shouldProcess) {
    return null;
  }

  const title = normalizeWhitespace($("title").first().text() || $("h1").first().text());
  if (!title) {
    return null;
  }

  const contentRoot = cleanContentRoot($, createContentRoot($));
  const content = normalizeWhitespace(contentRoot.text());
  if (content.length < 30) {
    return null;
  }

  const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/");
  const relativeWithoutExtension = relativePath.replace(/\.html$/i, "");
  const normalizedId = relativeWithoutExtension.endsWith("/index")
    ? relativeWithoutExtension.slice(0, -"/index".length)
    : relativeWithoutExtension === "index"
      ? ""
      : relativeWithoutExtension;
  const tags = [
    ...getMetaValues(meta, "article:tag"),
    ...getMetaValues(meta, "keywords").flatMap((entry) => entry.split(",")),
  ]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
  const headings = extractHeadings($, contentRoot, content);
  const summary = content.length > 200 ? `${content.slice(0, 200)}...` : content;

  return {
    id: normalizedId,
    title,
    summary,
    date: toIsoString(getFirstMetaValue(meta, "article:published_time")),
    updated_at: getFirstMetaValue(meta, "article:modified_time")
      ? toIsoString(getFirstMetaValue(meta, "article:modified_time"))
      : undefined,
    tags,
    url: normalizedId ? `/${normalizedId}` : "/",
    content,
    page_type: pageType,
    headings,
  };
}

export function buildArticleIndexes(sourceDir, { indexAll = false } = {}) {
  const articles = [];

  for (const filePath of walkHtmlFiles(sourceDir)) {
    const html = fs.readFileSync(filePath, "utf8");
    const article = buildArticleRecord(filePath, sourceDir, html, indexAll);
    if (article) {
      articles.push(article);
    }
  }

  articles.sort((left, right) => Date.parse(right.date) - Date.parse(left.date));

  return {
    articleCount: articles.length,
    searchIndex: buildSearchIndex(articles),
    filterIndex: buildFilterIndex(articles),
  };
}

export function writeArticleIndexes(outputDir, indexes) {
  fs.mkdirSync(outputDir, { recursive: true });

  const searchIndexPath = path.join(outputDir, "search_index.json");
  const filterIndexPath = path.join(outputDir, "filter_index.json");

  fs.writeFileSync(searchIndexPath, JSON.stringify(indexes.searchIndex));
  fs.writeFileSync(filterIndexPath, JSON.stringify(indexes.filterIndex));

  return {
    searchIndexPath,
    filterIndexPath,
  };
}
