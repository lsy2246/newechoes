import { execFileSync } from "node:child_process";
import path from "node:path";
import { parseGitHistoryLog } from "./parser.js";
import { formatArticleHistoryPath, resolveArticleIdentity } from "./shared.js";

const COMMIT_SEPARATOR = "\x1e";
const FIELD_SEPARATOR = "\x1f";
const historyCache = new Map();

function getArticleSourcePath(article) {
  if (article?.filePath) {
    return path.relative(process.cwd(), article.filePath).replace(/\\/g, "/");
  }

  return `src/content/${article.id}.${article.id.endsWith(".mdx") ? "mdx" : "md"}`;
}

function readGitLog(sourcePath) {
  return execFileSync(
    "git",
    [
      "-c",
      "core.quotePath=false",
      "log",
      "--follow",
      "--date=iso-strict",
      `--format=${COMMIT_SEPARATOR}%H${FIELD_SEPARATOR}%h${FIELD_SEPARATOR}%cI${FIELD_SEPARATOR}%aN${FIELD_SEPARATOR}%s`,
      "--name-status",
      "--",
      sourcePath,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
}

export function getArticleHistory(article, repositoryConfig = {}) {
  const articleIdentity = resolveArticleIdentity(article);
  const sourcePath = getArticleSourcePath(article);
  const publishedAt = article.data.date;
  const repositoryUrl = repositoryConfig?.url ?? "";
  const repositoryProvider = repositoryConfig?.provider ?? "";
  const cacheKey = [
    articleIdentity,
    sourcePath,
    publishedAt.toISOString(),
    repositoryUrl,
    repositoryProvider,
  ].join("\n");

  if (historyCache.has(cacheKey)) {
    return historyCache.get(cacheKey);
  }

  try {
    const history = parseGitHistoryLog({
      articleIdentity,
      sourcePath,
      publishedAt,
      logOutput: readGitLog(sourcePath),
      repositoryUrl,
      repositoryProvider,
    });
    historyCache.set(cacheKey, history);
    return history;
  } catch {
    const history = parseGitHistoryLog({
      articleIdentity,
      sourcePath,
      publishedAt,
      logOutput: "",
      repositoryUrl,
      repositoryProvider,
    });
    historyCache.set(cacheKey, history);
    return history;
  }
}

export function getArticleHistoryMap(articles, repositoryConfig = {}) {
  return new Map(
    articles.map((article) => [
      resolveArticleIdentity(article),
      getArticleHistory(article, repositoryConfig),
    ]),
  );
}

export { formatArticleHistoryPath };
export { parseGitHistoryLog };
