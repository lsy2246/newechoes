import fs from "node:fs";
import path from "node:path";
import { resolveArticleIdentity } from "./shared.js";

const historyCache = new Map();

function getEmptyHistory(article) {
  return {
    articleIdentity: resolveArticleIdentity(article),
    sourcePath: "",
    updatedAt: null,
    revisions: [],
    events: [
      {
        hash: "frontmatter",
        shortHash: "date",
        date: article.data.date,
        author: "",
        subject: "published",
        kind: "published",
        status: "A",
        previousPath: undefined,
        currentPath: "",
      },
    ],
  };
}

function normalizeHistoryRecord(record, fallbackArticle) {
  if (!record) {
    return getEmptyHistory(fallbackArticle);
  }

  return {
    ...record,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : null,
    revisions: Array.isArray(record.revisions)
      ? record.revisions.map((revision) => ({
        ...revision,
        date: new Date(revision.date),
      }))
      : [],
    events: Array.isArray(record.events)
      ? record.events.map((event) => ({
        ...event,
        date: new Date(event.date),
      }))
      : getEmptyHistory(fallbackArticle).events,
  };
}

function getHistoryIndexPath() {
  if (process.env.PREBUILT_ARTICLE_HISTORY_PATH) {
    return process.env.PREBUILT_ARTICLE_HISTORY_PATH;
  }

  const sourceTimePath = path.join(process.cwd(), ".astro", "assets", "index", "article-history.json");
  if (fs.existsSync(sourceTimePath)) {
    return sourceTimePath;
  }

  return path.join(process.cwd(), "dist", "assets", "index", "article-history.json");
}

function readHistoryIndex() {
  const historyIndexPath = getHistoryIndexPath();
  if (historyCache.has(historyIndexPath)) {
    return historyCache.get(historyIndexPath);
  }

  if (!fs.existsSync(historyIndexPath)) {
    const emptyIndex = { version: 1, articles: {} };
    historyCache.set(historyIndexPath, emptyIndex);
    return emptyIndex;
  }

  const parsed = JSON.parse(fs.readFileSync(historyIndexPath, "utf8"));
  historyCache.set(historyIndexPath, parsed);
  return parsed;
}

export async function getPrebuiltArticleHistory(article) {
  const historyIndex = readHistoryIndex();
  const articleIdentity = resolveArticleIdentity(article);
  return normalizeHistoryRecord(historyIndex.articles?.[articleIdentity], article);
}

export async function getPrebuiltArticleHistoryMap(articles) {
  const historyIndex = readHistoryIndex();
  return new Map(
    articles.map((article) => {
      const articleIdentity = resolveArticleIdentity(article);
      return [
        articleIdentity,
        normalizeHistoryRecord(historyIndex.articles?.[articleIdentity], article),
      ];
    }),
  );
}
