export function buildFilterIndex(articles) {
  return {
    version: 1,
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      summary: article.summary,
      url: article.url,
      date: article.date,
      updated_at: article.updated_at,
      tags: article.tags,
    })),
  };
}
