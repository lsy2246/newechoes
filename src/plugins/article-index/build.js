import fs from "node:fs";
import path from "node:path";
import { getArticleHistory } from "../../lib/article-history/node.js";

const REMOVED_LEGACY_FILES = ["search_index.bin", "filter_index.bin"];
const JSON_INDEX_FILES = ["search_index.json", "filter_index.json"];
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

function parseDate(value, fallback) {
  const parsed = Date.parse(value || "");
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return new Date(parsed).toISOString();
}

function getArticleUpdatedAt(filePath, articleId, publishedAt, contentRootDir) {
  const relativeId = path
    .relative(contentRootDir, filePath)
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/i, "");

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
  const summary = parseFrontmatterValue(parsedBlock.frontmatter, "summary")
    || `${content.slice(0, 200)}...`;

  return {
    id: articleId,
    title: articleId,
    summary,
    date: parseDate(rawDate, publishedAt.toISOString()),
    updated_at: getArticleUpdatedAt(filePath, articleId, publishedAt, contentRootDir),
    tags: parseFrontmatterArray(parsedBlock.frontmatter, "tags").sort((left, right) =>
      left.localeCompare(right, "zh-CN"),
    ),
    url: getCanonicalArticleUrl(articleId),
    content,
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

  return {
    articleCount: articles.length,
    searchIndex: buildSearchIndex(articles),
    filterIndex: buildFilterIndex(articles),
  };
}

export function writeArticleIndexes(outputDir, indexes) {
  fs.mkdirSync(outputDir, { recursive: true });
  cleanLegacyIndexFiles(outputDir);

  const searchIndexPath = path.join(outputDir, "search_index.json");
  const filterIndexPath = path.join(outputDir, "filter_index.json");

  fs.writeFileSync(searchIndexPath, JSON.stringify(indexes.searchIndex), "utf8");
  fs.writeFileSync(filterIndexPath, JSON.stringify(indexes.filterIndex), "utf8");

  return {
    searchIndexPath,
    filterIndexPath,
  };
}
