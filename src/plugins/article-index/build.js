import fs from "node:fs";
import path from "node:path";
import { createArticleRouteId } from "../../lib/article-route-id.js";
import { getArticleHistory } from "../../lib/article-history/node.js";

const REMOVED_LEGACY_FILES = ["search_index.bin", "filter_index.bin"];
const JSON_INDEX_FILES = ["search_index.json", "filter_index.json", "global_graph.json"];
const MARKDOWN_LINK_RE = /(?<!!)\[[^\]]*]\(([^)]+)\)/g;
const HTML_HREF_RE = /href\s*=\s*["']([^"']+)["']/g;
const SKIPPED_REFERENCE_PREFIXES = [
  "#",
  "http://",
  "https://",
  "//",
  "mailto:",
  "tel:",
  "javascript:",
  "data:",
];
const STOP_WORDS = new Set([
  "的",
  "是",
  "在",
  "了",
  "和",
  "与",
  "或",
  "而",
  "但",
  "如果",
  "因为",
  "所以",
  "这",
  "那",
  "这个",
  "那个",
  "这些",
  "那些",
  "并",
  "可以",
  "把",
  "被",
  "将",
  "已",
  "就",
  "也",
  "很",
  "到",
  "上",
  "下",
  "中",
  "为",
]);

function listContentFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const contentFiles = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const targetPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      contentFiles.push(...listContentFiles(targetPath));
      continue;
    }
    if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      contentFiles.push(targetPath);
    }
  }

  return contentFiles;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function stripMarkdownTitle(target) {
  const trimmed = target.trim().replace(/^<|>$/g, "");
  const titleMatch = trimmed.match(/^(\S+)\s+["'(].*$/);
  return titleMatch ? titleMatch[1] : trimmed;
}

function normalizeArticleReferenceTarget(target) {
  if (!target) {
    return null;
  }

  let normalized = stripMarkdownTitle(target);
  if (!normalized) {
    return null;
  }

  const lowerTarget = normalized.toLowerCase();
  if (SKIPPED_REFERENCE_PREFIXES.some((prefix) => lowerTarget.startsWith(prefix))) {
    return null;
  }

  try {
    normalized = decodeURI(normalized);
  } catch {
    // Keep malformed URI segments as-is so a plain text match can still work.
  }

  normalized = normalized.split("#")[0]?.split("?")[0]?.trim() ?? "";
  normalized = normalized.replace(/\/+$/, "");

  if (!normalized) {
    return null;
  }

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

function parseFrontmatterBlock(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return null;
  }

  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
  };
}

function parseFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(
    new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n]+))\\s*$`, "m"),
  );
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function parseFrontmatterArray(frontmatter, key) {
  const raw = parseFrontmatterValue(frontmatter, key);
  if (!raw || raw === "[]") {
    return [];
  }

  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  return [raw.replace(/^["']|["']$/g, "")].filter(Boolean);
}

function cleanInlineMarkdown(value) {
  return normalizeWhitespace(
    String(value || "")
      .replace(/!\[([^\]]*)]\([^)]+\)/g, " $1 ")
      .replace(/\[([^\]]+)]\([^)]+\)/g, " $1 ")
      .replace(/`([^`]+)`/g, " $1 ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^{}]*\}/g, " ")
      .replace(/[_*~]+/g, "")
      .replace(/\|/g, " "),
  );
}

function extractHeadings(markdownBody) {
  const headings = [];
  let inCodeFence = false;

  for (const line of markdownBody.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      continue;
    }

    const match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) {
      continue;
    }

    const text = cleanInlineMarkdown(match[2]);
    if (!text) {
      continue;
    }

    headings.push({
      level: match[1].length,
      text,
    });
  }

  return headings;
}

function extractPlainContent(markdownBody) {
  const lines = [];
  let inCodeFence = false;

  for (const line of markdownBody.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (/^\s*import\s.+from\s+["'][^"']+["'];?\s*$/.test(line)) {
      continue;
    }
    if (/^\s*export\s+(default\s+)?/.test(line)) {
      continue;
    }

    const normalizedLine = cleanInlineMarkdown(
      line
        .replace(/^\s{0,3}(#{1,6})\s+/, "")
        .replace(/^\s{0,3}>\s?/, "")
        .replace(/^\s*[-+*]\s+/, "")
        .replace(/^\s*\d+\.\s+/, ""),
    );

    if (!normalizedLine) {
      continue;
    }

    lines.push(normalizedLine);
  }

  return normalizeWhitespace(lines.join(" "));
}

function getCanonicalArticleUrl(articleId) {
  return `/articles/${encodeURI(articleId)}`;
}

function getSectionUrl(sectionPath) {
  return `/articles/${encodeURI(sectionPath)}`;
}

function getSpecialPath(originalPath) {
  const parts = String(originalPath || "").split("/");
  const fileName = parts[parts.length - 1] || "";
  const dirName = parts.length > 1 ? parts[parts.length - 2] : "";

  if (dirName && fileName.toLowerCase() === dirName.toLowerCase()) {
    const newFileName = fileName.startsWith("_") ? fileName : `_${fileName}`;
    return [...parts.slice(0, -1), newFileName].join("/");
  }

  return String(originalPath || "");
}

function addArticleRouteVariants(variants, routeId) {
  if (!routeId) {
    return;
  }

  for (const candidate of [routeId, encodeURI(routeId)]) {
    variants.add(candidate);
    variants.add(`/${candidate}`);
    variants.add(`articles/${candidate}`);
    variants.add(`/articles/${candidate}`);
  }
}

function getArticleReferenceVariants(article) {
  const variants = new Set();
  const canonicalId = article.title;
  const sourceId = article.routeId;
  const routeIds = new Set([
    canonicalId,
    sourceId,
    getSpecialPath(sourceId),
  ]);

  if (canonicalId !== sourceId) {
    routeIds.add(getSpecialPath(canonicalId));
  }

  for (const routeId of routeIds) {
    addArticleRouteVariants(variants, routeId);
  }

  return [...variants];
}

function createArticleReferenceResolver(articles) {
  const routeMap = new Map();

  for (const article of articles) {
    for (const variant of getArticleReferenceVariants(article)) {
      const normalized = normalizeArticleReferenceTarget(variant);
      if (normalized) {
        routeMap.set(normalized.toLowerCase(), article.title);
      }
    }
  }

  return (href) => {
    const normalized = normalizeArticleReferenceTarget(href);
    if (!normalized) {
      return null;
    }
    return routeMap.get(normalized.toLowerCase()) ?? null;
  };
}

function extractReferenceTargets(rawContent) {
  const targets = [];

  for (const match of String(rawContent || "").matchAll(MARKDOWN_LINK_RE)) {
    const target = match[1]?.trim();
    if (target) {
      targets.push(target);
    }
  }

  for (const match of String(rawContent || "").matchAll(HTML_HREF_RE)) {
    const target = match[1]?.trim();
    if (target) {
      targets.push(target);
    }
  }

  return targets;
}

function extractArticleReferences(rawContent, resolveArticleReference) {
  const references = new Set();

  for (const target of extractReferenceTargets(rawContent)) {
    const articleId = resolveArticleReference(target);
    if (articleId) {
      references.add(articleId);
    }
  }

  return references;
}

function getContentRelativeSourcePath(filePath, contentRootDir) {
  return path
    .relative(contentRootDir, filePath)
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/i, "");
}

function getContentRouteId(filePath, contentRootDir) {
  return createArticleRouteId(path.relative(contentRootDir, filePath));
}

function parseDate(value, fallback) {
  const parsed = Date.parse(value || "");
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return new Date(parsed).toISOString();
}

function getArticleUpdatedAt(filePath, articleId, publishedAt, contentRootDir) {
  const relativeId = getContentRelativeSourcePath(filePath, contentRootDir);

  const history = getArticleHistory({
    id: relativeId,
    filePath,
    data: {
      title: articleId,
      date: publishedAt,
    },
  });

  return history.updatedAt ? history.updatedAt.toISOString() : null;
}

function extractArticleRecord(filePath, contentRootDir) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsedBlock = parseFrontmatterBlock(source);
  if (!parsedBlock) {
    return null;
  }

  const title = parseFrontmatterValue(parsedBlock.frontmatter, "title");
  const rawDate = parseFrontmatterValue(parsedBlock.frontmatter, "date");
  const draft = parseFrontmatterValue(parsedBlock.frontmatter, "draft").toLowerCase() === "true";

  if (!title || !rawDate || draft) {
    return null;
  }

  const publishedAt = new Date(rawDate);
  if (Number.isNaN(publishedAt.getTime())) {
    return null;
  }

  const content = extractPlainContent(parsedBlock.body);
  if (content.length < 30) {
    return null;
  }

  const articleId = title.trim();
  const routeId = getContentRouteId(filePath, contentRootDir);
  const summary = parseFrontmatterValue(parsedBlock.frontmatter, "summary")
    || `${content.slice(0, 200)}...`;

  return {
    id: articleId,
    routeId,
    title: articleId,
    summary,
    date: parseDate(rawDate, publishedAt.toISOString()),
    updated_at: getArticleUpdatedAt(filePath, articleId, publishedAt, contentRootDir),
    tags: parseFrontmatterArray(parsedBlock.frontmatter, "tags").sort((left, right) =>
      left.localeCompare(right, "zh-CN"),
    ),
    url: getCanonicalArticleUrl(routeId),
    content,
    body: parsedBlock.body,
    page_type: "article",
    headings: extractHeadings(parsedBlock.body),
  };
}

function extractKeywords(text) {
  const normalized = normalizeText(text);
  const keywords = new Set();
  let currentWord = "";
  let unicodeBuffer = [];

  const flushUnicodeBuffer = () => {
    if (unicodeBuffer.length === 0) {
      return;
    }
    for (let size = 1; size <= Math.min(unicodeBuffer.length, 3); size += 1) {
      for (let start = 0; start <= unicodeBuffer.length - size; start += 1) {
        const term = unicodeBuffer.slice(start, start + size).join("");
        if (term.length >= 2) {
          keywords.add(term);
        }
      }
    }
    unicodeBuffer = [];
  };

  const flushCurrentWord = () => {
    if (currentWord.length >= 2) {
      keywords.add(currentWord);
    }
    currentWord = "";
  };

  for (const character of normalized) {
    if (/^[\p{L}\p{N}_-]$/u.test(character) && character.charCodeAt(0) < 128) {
      flushUnicodeBuffer();
      currentWord += character;
      continue;
    }

    if (/\s/u.test(character) || /[^\p{L}\p{N}\p{Script=Han}_-]/u.test(character)) {
      flushCurrentWord();
      flushUnicodeBuffer();
      continue;
    }

    flushCurrentWord();
    unicodeBuffer.push(character);
  }

  flushCurrentWord();
  flushUnicodeBuffer();

  return [...keywords].filter((keyword) => !/^\d+$/u.test(keyword));
}

function addToIndex(indexMap, key, value) {
  if (!indexMap.has(key)) {
    indexMap.set(key, new Set());
  }
  indexMap.get(key).add(value);
}

function mapSetToObject(indexMap) {
  const entries = [...indexMap.entries()].sort((left, right) =>
    left[0].localeCompare(right[0], "zh-CN"),
  );

  return Object.fromEntries(
    entries.map(([key, values]) => [key, [...values].sort((left, right) => left - right)]),
  );
}

function mapStringSetToObject(indexMap) {
  const entries = [...indexMap.entries()].sort((left, right) =>
    left[0].localeCompare(right[0], "zh-CN"),
  );

  return Object.fromEntries(
    entries.map(([key, values]) => [
      key,
      [...values].sort((left, right) => left.localeCompare(right, "zh-CN")),
    ]),
  );
}

function buildSearchIndex(articles) {
  const titleTermIndex = new Map();
  const headingTermIndex = new Map();
  const contentTermIndex = new Map();
  const termFrequency = new Map();

  articles.forEach((article, articleIndex) => {
    for (const keyword of extractKeywords(article.title)) {
      addToIndex(titleTermIndex, keyword, articleIndex);
      if (!STOP_WORDS.has(keyword) && keyword.length >= 2) {
        termFrequency.set(keyword, (termFrequency.get(keyword) || 0) + 3);
      }
    }

    for (const word of article.title
      .toLowerCase()
      .split(/\s+/u)
      .map((value) => value.replace(/^[^\p{L}\p{N}_-]+|[^\p{L}\p{N}_-]+$/gu, ""))
      .filter((value) => value.length >= 2)) {
      addToIndex(titleTermIndex, word, articleIndex);
    }

    article.headings.forEach((heading, headingIndex) => {
      const headingId = `${article.id}:${headingIndex}`;
      for (const keyword of extractKeywords(heading.text)) {
        addToIndex(headingTermIndex, keyword, headingId);
      }
    });

    const articleTermFrequency = new Map();
    for (const keyword of extractKeywords(article.content)) {
      if (STOP_WORDS.has(keyword) || keyword.length < 2) {
        continue;
      }

      addToIndex(contentTermIndex, keyword, articleIndex);
      articleTermFrequency.set(keyword, (articleTermFrequency.get(keyword) || 0) + 1);
    }

    for (const [keyword, frequency] of articleTermFrequency.entries()) {
      if (frequency >= 2) {
        termFrequency.set(keyword, (termFrequency.get(keyword) || 0) + 1);
      }
    }
  });

  const commonTerms = Object.fromEntries(
    [...termFrequency.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 500),
  );

  return {
    title_term_index: mapSetToObject(titleTermIndex),
    articles,
    heading_term_index: mapStringSetToObject(headingTermIndex),
    common_terms: commonTerms,
    content_term_index: mapSetToObject(contentTermIndex),
  };
}

function buildFilterIndex(articles) {
  const tagIndex = new Map();

  articles.forEach((article, articleIndex) => {
    for (const tag of article.tags) {
      addToIndex(tagIndex, tag, articleIndex);
    }
  });

  return {
    articles,
    tag_index: mapSetToObject(tagIndex),
  };
}

function toPublicArticleRecord(article) {
  const {
    routeId,
    body,
    ...publicArticle
  } = article;

  return publicArticle;
}

function createSectionRecord(sectionPath) {
  const parts = sectionPath.split("/");
  return {
    name: parts[parts.length - 1] || sectionPath,
    path: sectionPath,
    articles: [],
    sections: [],
  };
}

function buildContentStructure(articles) {
  const sections = new Map();
  const rootArticles = [];

  const ensureSection = (sectionPath) => {
    if (sections.has(sectionPath)) {
      return sections.get(sectionPath);
    }

    const section = createSectionRecord(sectionPath);
    sections.set(sectionPath, section);

    const parentPath = sectionPath.split("/").slice(0, -1).join("/");
    if (parentPath) {
      const parentSection = ensureSection(parentPath);
      if (!parentSection.sections.some((child) => child.path === section.path)) {
        parentSection.sections.push(section);
      }
    }

    return section;
  };

  for (const article of articles) {
    const routeParts = article.routeId.split("/");
    const sectionPath = routeParts.slice(0, -1).join("/");

    if (!sectionPath) {
      rootArticles.push(article.routeId);
      continue;
    }

    ensureSection(sectionPath).articles.push(article.routeId);
  }

  return {
    articles: rootArticles,
    sections: [...sections.values()].filter((section) => !section.path.includes("/")),
  };
}

function collectGraphSections(sections, graphNodes, graphLinks, parentPath = "") {
  sections.forEach((section) => {
    const topSectionPath = parentPath ? parentPath.split("/")[0] : section.path.split("/")[0] ?? "";
    const node = {
      id: `section:${section.path}`,
      label: section.name,
      type: "section",
      route: getSectionUrl(section.path),
      sectionPath: section.path,
      topSectionPath,
    };

    graphNodes.push(node);
    graphLinks.push({
      source: parentPath ? `section:${parentPath}` : "root",
      target: node.id,
      kind: "structure",
    });

    collectGraphSections(section.sections, graphNodes, graphLinks, section.path);
  });
}

function addReferenceLink(graphLinks, seenLinks, source, target) {
  const linkKey = `${source}->${target}:reference`;
  if (seenLinks.has(linkKey)) {
    return;
  }

  seenLinks.add(linkKey);
  graphLinks.push({
    source,
    target,
    kind: "reference",
  });
}

export function buildGlobalGraphIndex(articles) {
  const structure = buildContentStructure(articles);
  const graphNodes = [
    {
      id: "root",
      label: "全部文章",
      type: "root",
      route: "/articles",
    },
  ];
  const graphLinks = [];

  collectGraphSections(structure.sections, graphNodes, graphLinks);

  const articleRecords = articles.map((article) => ({
    id: article.routeId,
    identity: article.title,
    title: article.title,
    route: getCanonicalArticleUrl(article.routeId),
  }));

  articles.forEach((sourceArticle) => {
    const sectionPath = sourceArticle.routeId.includes("/")
      ? sourceArticle.routeId.slice(0, sourceArticle.routeId.lastIndexOf("/"))
      : "";
    const topSectionPath = sourceArticle.routeId.includes("/") ? sourceArticle.routeId.split("/")[0] : "";

    graphNodes.push({
      id: `article:${sourceArticle.title}`,
      label: sourceArticle.title,
      type: "article",
      route: getCanonicalArticleUrl(sourceArticle.routeId),
      sectionPath,
      topSectionPath,
    });

    graphLinks.push({
      source: sectionPath ? `section:${sectionPath}` : "root",
      target: `article:${sourceArticle.title}`,
      kind: "structure",
    });
  });

  const resolveArticleReference = createArticleReferenceResolver(articles);
  const seenReferenceLinks = new Set();

  for (const sourceArticle of articles) {
    for (const targetIdentity of extractArticleReferences(sourceArticle.body, resolveArticleReference)) {
      if (sourceArticle.title === targetIdentity) {
        continue;
      }

      addReferenceLink(
        graphLinks,
        seenReferenceLinks,
        `article:${sourceArticle.title}`,
        `article:${targetIdentity}`,
      );
    }
  }

  return {
    nodes: graphNodes,
    links: graphLinks,
    structure,
    articles: articleRecords,
  };
}

function cleanLegacyIndexFiles(outputDir) {
  for (const fileName of [...JSON_INDEX_FILES, ...REMOVED_LEGACY_FILES]) {
    const targetPath = path.join(outputDir, fileName);
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { force: true });
    }
  }
}

export function buildArticleIndexes(contentDir) {
  const articles = [];
  const contentFiles = listContentFiles(contentDir);

  for (const filePath of contentFiles) {
    const article = extractArticleRecord(filePath, contentDir);
    if (article) {
      articles.push(article);
    }
  }

  articles.sort((left, right) => right.date.localeCompare(left.date));
  const publicArticles = articles.map(toPublicArticleRecord);

  return {
    articleCount: articles.length,
    searchIndex: buildSearchIndex(publicArticles),
    filterIndex: buildFilterIndex(publicArticles),
    globalGraphIndex: buildGlobalGraphIndex(articles),
  };
}

export function writeArticleIndexes(outputDir, indexes) {
  fs.mkdirSync(outputDir, { recursive: true });
  cleanLegacyIndexFiles(outputDir);

  const searchIndexPath = path.join(outputDir, "search_index.json");
  const filterIndexPath = path.join(outputDir, "filter_index.json");
  const globalGraphIndexPath = path.join(outputDir, "global_graph.json");

  fs.writeFileSync(searchIndexPath, JSON.stringify(indexes.searchIndex), "utf8");
  fs.writeFileSync(filterIndexPath, JSON.stringify(indexes.filterIndex), "utf8");
  fs.writeFileSync(globalGraphIndexPath, JSON.stringify(indexes.globalGraphIndex), "utf8");

  return {
    searchIndexPath,
    filterIndexPath,
    globalGraphIndexPath,
  };
}
