export function resolveArticleIdentity(article) {
  const title = article?.data?.title;
  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }
  return article?.id ?? "";
}

export function assertUniqueArticleIdentities(articles) {
  const articleIdsByTitle = new Map();

  for (const article of articles) {
    const identity = resolveArticleIdentity(article);
    if (!identity) {
      continue;
    }

    const articleIds = articleIdsByTitle.get(identity) ?? [];
    articleIds.push(article.id);
    articleIdsByTitle.set(identity, articleIds);
  }

  const duplicate = [...articleIdsByTitle.entries()].find(([, articleIds]) => articleIds.length > 1);
  if (duplicate) {
    const [identity, articleIds] = duplicate;
    throw new Error(`Duplicate article title "${identity}": ${articleIds.join(", ")}`);
  }
}

export function formatArticleHistoryPath(gitPath) {
  return String(gitPath ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^src\/content\//, "");
}
