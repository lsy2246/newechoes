import fs from "node:fs/promises";
import path from "node:path";
import { SITE_META, NAV_STRUCTURE } from "../consts";
import { createCanonicalUrl, normalizeCanonicalPath } from "../lib/canonical-url.js";
import { resolveBuildDir } from "./build-output.js";

function flattenNavigation(items, level = 0) {
  return items.flatMap((item) => {
    const current = item.href
      ? [{ level, text: item.text, href: item.href }]
      : [];
    const children = Array.isArray(item.items)
      ? flattenNavigation(item.items, level + 1)
      : [];

    return [...current, ...children];
  });
}

function getArticleSection(article) {
  const parts = article.sourcePath.split("/");
  return parts.length > 1 ? parts[0] : "articles";
}

function getArticleSummary(article) {
  if (article.summary) {
    return article.summary;
  }

  const plainText = article.content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*`~>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.length > 120 ? `${plainText.slice(0, 120)}...` : plainText;
}

function getCanonicalArticleUrl(articleId) {
  return normalizeCanonicalPath(`/articles/${encodeURI(articleId)}`);
}

function formatArticleLine(article) {
  const articleIdentity = article.title;
  const url = createCanonicalUrl(getCanonicalArticleUrl(articleIdentity), SITE_META.url);
  const date = article.date ? article.date.slice(0, 10) : "";
  const tags = article.tags?.length ? ` 标签: ${article.tags.join(", ")}` : "";
  const summary = getArticleSummary(article);

  return `- [${article.title}](${url})${date ? ` - ${date}` : ""}${tags}${summary ? ` - ${summary}` : ""}`;
}

function parseFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n]+))\\s*$`, "m"));
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

async function scanContentArticles(contentDir = path.join(process.cwd(), "src", "content")) {
  const articles = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }

      if (!/\.(md|mdx)$/i.test(entry.name)) {
        continue;
      }

      const source = await fs.readFile(entryPath, "utf8");
      const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      if (!frontmatterMatch) {
        continue;
      }

      const frontmatter = frontmatterMatch[1];
      const title = parseFrontmatterValue(frontmatter, "title");
      const date = parseFrontmatterValue(frontmatter, "date");
      const draft = parseFrontmatterValue(frontmatter, "draft").toLowerCase() === "true";

      if (!title || draft) {
        continue;
      }

      const relativePath = path
        .relative(contentDir, entryPath)
        .replace(/\\/g, "/")
        .replace(/\.(md|mdx)$/i, "");

      articles.push({
        title,
        date,
        tags: parseFrontmatterArray(frontmatter, "tags"),
        summary: parseFrontmatterValue(frontmatter, "summary"),
        content: source.slice(frontmatterMatch[0].length),
        sourcePath: relativePath,
      });
    }
  }

  await visit(contentDir);
  return articles.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function generateLlmsTxt(articles) {
  const grouped = new Map();

  for (const article of articles) {
    const section = getArticleSection(article);
    if (!grouped.has(section)) {
      grouped.set(section, []);
    }
    grouped.get(section).push(article);
  }

  const navLines = flattenNavigation(NAV_STRUCTURE)
    .map((item) => `- [${item.text}](${createCanonicalUrl(item.href, SITE_META.url)})`)
    .join("\n");

  const articleSections = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right, "zh-CN"))
    .map(([section, sectionArticles]) => {
      const lines = sectionArticles
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .map(formatArticleLine)
        .join("\n");

      return `## ${section}\n\n${lines}`;
    })
    .join("\n\n");

  return `# ${SITE_META.title}

作者: ${SITE_META.author}
站点: ${SITE_META.url}

## 主入口

${navLines}

## 全部公开文章

${articleSections}
`;
}

export function llmsIntegration() {
  let llmsTxtContent = "";

  return {
    name: "llms-integration",
    hooks: {
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/llms.txt" && req.method === "GET") {
            const distPath = path.join(process.cwd(), "dist/client/llms.txt");

            fs.readFile(distPath, "utf-8")
              .then((content) => {
                res.setHeader("Content-Type", "text/plain; charset=UTF-8");
                res.end(content);
              })
              .catch(() => {
                res.statusCode = 404;
                res.end("llms.txt 未找到，请先运行构建");
              });
            return;
          }

          next();
        });
      },
      "astro:build:start": async () => {
        llmsTxtContent = generateLlmsTxt(await scanContentArticles());
      },
      "astro:build:done": async ({ dir }) => {
        const buildDirPath = resolveBuildDir(dir);
        await fs.mkdir(buildDirPath, { recursive: true });

        await fs.writeFile(path.join(buildDirPath, "llms.txt"), llmsTxtContent, "utf8");
        console.log("已生成 llms.txt");
      },
    },
  };
}
