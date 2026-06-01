import { supportsArticleHistory } from "../runtime/platform";
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
  if (!supportsArticleHistory()) {
    return getEmptyHistory(article);
  }

  const module = await import("./node.js");
  return module.getArticleHistory(article, repositoryConfig);
}

export async function getArticleHistoryMap(articles, repositoryConfig = {}) {
  if (!supportsArticleHistory()) {
    return new Map(
      articles.map((article) => [resolveArticleIdentity(article), getEmptyHistory(article)]),
    );
  }

  const module = await import("./node.js");
  return module.getArticleHistoryMap(articles, repositoryConfig);
}

export {
  assertUniqueArticleIdentities,
  formatArticleHistoryPath,
  resolveArticleIdentity,
} from "./shared.js";
export { parseGitHistoryLog } from "./node.js";
