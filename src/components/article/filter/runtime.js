function normalizeString(value) {
  return String(value || "").trim().toLowerCase();
}

function clampPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toTimestamp(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function withinDateRange(article, dateFilter) {
  if (!dateFilter || dateFilter === "all") {
    return true;
  }

  const [startDate = "", endDate = ""] = String(dateFilter || "").split(",");
  const articleDate = String(article.date || "").slice(0, 10);

  if (startDate && articleDate < startDate) {
    return false;
  }

  if (endDate && articleDate > endDate) {
    return false;
  }

  return true;
}

function sortFilteredArticles(articles, sort) {
  const direction = sort === "oldest" ? 1 : -1;

  if (sort === "title_asc" || sort === "title_desc") {
    const titleDirection = sort === "title_asc" ? 1 : -1;
    return [...articles].sort((left, right) =>
      left.title.localeCompare(right.title, "zh-CN") * titleDirection);
  }

  return [...articles].sort((left, right) =>
    (toTimestamp(left.date) - toTimestamp(right.date)) * direction);
}

export function createFilterRuntime(filterIndex) {
  const articles = Array.isArray(filterIndex?.articles) ? filterIndex.articles : [];
  const allTags = Array.from(
    new Set(
      articles.flatMap((article) => (Array.isArray(article.tags) ? article.tags : []))
        .map((tag) => String(tag || "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));

  return {
    getAllTags() {
      return allTags;
    },
    filter(request = {}) {
      const tags = Array.isArray(request.tags)
        ? request.tags.map((tag) => normalizeString(tag)).filter(Boolean)
        : [];
      const page = clampPositiveInteger(request.page, 1);
      const limit = clampPositiveInteger(request.limit, 12);
      const sort = String(request.sort || "newest");

      const filtered = articles.filter((article) => {
        const articleTags = (Array.isArray(article.tags) ? article.tags : [])
          .map((tag) => normalizeString(tag));

        if (tags.length > 0 && !tags.every((tag) => articleTags.includes(tag))) {
          return false;
        }

        return withinDateRange(article, request.date);
      });

      const sorted = sortFilteredArticles(filtered, sort);
      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      const articlesPage = sorted.slice(start, start + limit);

      return {
        articles: articlesPage,
        total,
        page,
        limit,
        total_pages: totalPages,
      };
    },
  };
}
