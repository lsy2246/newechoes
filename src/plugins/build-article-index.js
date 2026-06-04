import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getArticleHistory } from "../lib/article-history/node.js";
import { getStaticOutputMirrorRoots, resolveBuildDir } from "../platform/build/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const defaultBuildDir = path.resolve(rootDir, "dist");
const defaultContentDir = path.resolve(rootDir, "src", "content");
const indexDir = path.join(resolveBuildDir(defaultBuildDir), "assets", "index");
const INDEX_OUTPUT_FILES = ["search_index.json", "filter_index.json"];
const REMOVED_LEGACY_FILES = ["search_index.bin", "filter_index.bin"];
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

export function prepareArticleIndexRuntimeArtifacts() {
  if (process.env.ARTICLE_INDEX_RUNTIME_PREPARED === "true") {
    return;
  }

  console.log("[索引构建] 当前运行时产物:");
  console.log("- 运行时产物策略: pure-js");
  console.log("- article index runtime: Node.js source content scanner");
  process.env.ARTICLE_INDEX_RUNTIME_PREPARED = "true";
}

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
  return value.replace(/\s+/g, " ").trim();
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
    value
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

    if (inCodeFence) {
      lines.push(normalizedLine);
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
    entries.map(([key, values]) => [key, [...values].sort((left, right) => left.localeCompare(right, "zh-CN"))]),
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

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf8");
}

function cleanLegacyIndexFiles(dirPath) {
  for (const fileName of [...INDEX_OUTPUT_FILES, ...REMOVED_LEGACY_FILES]) {
    const targetPath = path.join(dirPath, fileName);
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { force: true });
    }
  }
}

function replaceDirectoryContents(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return false;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    fs.copyFileSync(sourcePath, targetPath);
  }

  return true;
}

function getPlatformIndexMirrorDirs(buildDirPath, outputDirPath) {
  const relativeIndexDir = path.relative(buildDirPath, outputDirPath);
  if (!relativeIndexDir || relativeIndexDir.startsWith("..")) {
    return [];
  }

  return getStaticOutputMirrorRoots({ cwd: rootDir })
    .filter((candidateRootDir) => fs.existsSync(candidateRootDir))
    .map((rootDirPath) => path.join(rootDirPath, relativeIndexDir));
}

function syncIndexArtifactsToPlatformOutputs(buildDirPath, outputDirPath) {
  const mirroredDirs = [];

  for (const targetDir of getPlatformIndexMirrorDirs(buildDirPath, outputDirPath)) {
    const copied = replaceDirectoryContents(outputDirPath, targetDir);
    if (copied) {
      mirroredDirs.push(targetDir);
    }
  }

  return mirroredDirs;
}

function getLatestSourceMtimeMs(contentRootDir) {
  return listContentFiles(contentRootDir).reduce((latestTime, filePath) => {
    const fileMtime = fs.statSync(filePath).mtimeMs;
    return Math.max(latestTime, fileMtime);
  }, 0);
}

function needsIndexRefresh(contentRootDir, outputDirPath) {
  for (const fileName of INDEX_OUTPUT_FILES) {
    const targetPath = path.join(outputDirPath, fileName);
    if (!fs.existsSync(targetPath)) {
      return true;
    }
  }

  const latestSourceMtime = getLatestSourceMtimeMs(contentRootDir);
  const oldestOutputMtime = INDEX_OUTPUT_FILES.reduce((oldestTime, fileName) => {
    const targetPath = path.join(outputDirPath, fileName);
    return Math.min(oldestTime, fs.statSync(targetPath).mtimeMs);
  }, Number.POSITIVE_INFINITY);

  return latestSourceMtime > oldestOutputMtime;
}

export function articleIndexerIntegration() {
  let devIndexBuildPromise = null;

  const ensureDevIndexes = async () => {
    if (!needsIndexRefresh(defaultContentDir, indexDir)) {
      return;
    }

    if (!devIndexBuildPromise) {
      devIndexBuildPromise = generateArticleIndex({
        buildDir: defaultBuildDir,
        contentDir: defaultContentDir,
        outputDir: indexDir,
      }).finally(() => {
        devIndexBuildPromise = null;
      });
    }

    await devIndexBuildPromise;
  };

  return {
    name: "article-indexer-integration",
    hooks: {
      "astro:server:setup": ({ server }) => {
        void ensureDevIndexes().catch((error) => {
          console.error("[索引构建] 开发态预生成索引失败:", error);
        });

        server.middlewares.use((req, res, next) => {
          if (!req.url.startsWith("/assets/index/") || req.method !== "GET") {
            next();
            return;
          }

          void ensureDevIndexes()
            .then(() => {
              const requestedFile = req.url.slice("/assets/index/".length);
              const filePath = path.join(indexDir, requestedFile);
              if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                res.statusCode = 404;
                res.end("索引文件未找到");
                return;
              }

              const stat = fs.statSync(filePath);
              const contentType = filePath.endsWith(".json")
                ? "application/json"
                : "application/octet-stream";
              res.setHeader("Content-Type", contentType);
              res.setHeader("Content-Length", stat.size);
              fs.createReadStream(filePath).pipe(res);
            })
            .catch((error) => {
              res.statusCode = 500;
              res.end(`索引生成失败: ${error instanceof Error ? error.message : String(error)}`);
            });
        });
      },
      "astro:build:done": async ({ dir }) => {
        console.log("Astro构建完成，开始生成文章索引...");
        const clientDirPath = resolveBuildDir(dir);
        const outputDirPath = path.join(clientDirPath, "assets", "index");
        await generateArticleIndex({
          buildDir: clientDirPath,
          contentDir: defaultContentDir,
          outputDir: outputDirPath,
        });
      },
    },
  };
}

export async function generateArticleIndex(options = {}) {
  console.log("开始生成文章索引...");

  const buildDirPath = options.buildDir || defaultBuildDir;
  const contentDirPath = options.contentDir || defaultContentDir;
  const outputDirPath = options.outputDir || indexDir;

  console.log(`内容目录: ${contentDirPath}`);
  console.log(`索引输出目录: ${outputDirPath}`);

  if (!fs.existsSync(contentDirPath)) {
    const error = new Error(`内容目录不存在: ${contentDirPath}`);
    console.error("生成文章索引时出错:", error.message);
    throw error;
  }

  prepareArticleIndexRuntimeArtifacts();
  ensureDirectory(buildDirPath);
  ensureDirectory(outputDirPath);
  cleanLegacyIndexFiles(outputDirPath);

  const contentFiles = listContentFiles(contentDirPath);
  console.log("扫描内容源文件...");

  const articles = [];
  for (const filePath of contentFiles) {
    const article = extractArticleRecord(filePath, contentDirPath);
    if (article) {
      console.log(`处理: ${filePath}`);
      articles.push(article);
    }
  }

  articles.sort((left, right) => right.date.localeCompare(left.date));

  console.log(`扫描完成。找到 ${articles.length} 篇有效文章，扫描 ${contentFiles.length} 个源文件。`);

  if (articles.length === 0) {
    const error = new Error("没有找到有效文章");
    console.error("生成文章索引时出错:", error.message);
    throw error;
  }

  const filterIndex = buildFilterIndex(articles);
  const searchIndex = buildSearchIndex(articles);

  writeJson(path.join(outputDirPath, "filter_index.json"), filterIndex);
  writeJson(path.join(outputDirPath, "search_index.json"), searchIndex);

  const mirroredDirs = syncIndexArtifactsToPlatformOutputs(buildDirPath, outputDirPath);
  if (mirroredDirs.length > 0) {
    console.log(`[索引构建] 已同步索引产物到平台目录: ${mirroredDirs.join(", ")}`);
  } else {
    console.log("[索引构建] 未检测到额外的平台索引镜像目录，保留默认输出目录");
  }

  console.log("文章索引生成完成!");
  console.log(`索引文件保存在: ${outputDirPath}`);

  return {
    success: true,
    indexPath: outputDirPath,
  };
}
