import { resolveArticleIdentity } from "./shared.js";

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

export async function getArticleHistory(article, repositoryConfig = {}) {
  try {
    const module = await import("./node.js");
    return module.getArticleHistory(article, repositoryConfig);
  } catch {
    return getEmptyHistory(article);
  }
}

export async function getArticleHistoryMap(articles, repositoryConfig = {}) {
  try {
    const module = await import("./node.js");
    return module.getArticleHistoryMap(articles, repositoryConfig);
  } catch {
    return new Map(
      articles.map((article) => [resolveArticleIdentity(article), getEmptyHistory(article)]),
    );
  }
}

export {
  assertUniqueArticleIdentities,
  formatArticleHistoryPath,
  resolveArticleIdentity,
} from "./shared.js";
export { parseGitHistoryLog } from "./parser.js";
