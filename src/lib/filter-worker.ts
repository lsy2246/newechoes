type FilterRequest = {
  tags?: string[];
  sort?: string;
  page?: number;
  limit?: number;
  date?: string;
};

type WorkerRequest =
  | { id: number; type: "initFilter"; payload: { indexUrl: string } }
  | { id: number; type: "filter"; payload: { request: FilterRequest } }
  | { id: number; type: "getTags" };

type WorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

type ArticleMetadata = {
  id: string;
  title: string;
  summary: string;
  date: string;
  updated_at?: string | null;
  tags: string[];
  url: string;
};

type RawFilterIndex = {
  articles: ArticleMetadata[];
  tag_index: Record<string, number[]>;
};

type FilterRuntime = {
  articles: ArticleMetadata[];
  tagIndex: Record<string, number[]>;
};

type FilterResult = {
  articles: ArticleMetadata[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

let filterRuntime: FilterRuntime | null = null;

const respond = (id: number, payload: unknown) => {
  const message: WorkerResponse = { id, type: "result", payload };
  self.postMessage(message);
};

const respondError = (id: number, error: unknown) => {
  const message: WorkerResponse = {
    id,
    type: "error",
    error: {
      message: error instanceof Error ? error.message : String(error),
    },
  };
  self.postMessage(message);
};

const loadJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`获取筛选索引失败: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
};

const createFilterRuntime = (payload: RawFilterIndex): FilterRuntime => ({
  articles: Array.isArray(payload.articles) ? payload.articles : [],
  tagIndex: payload.tag_index || {},
});

const ensureFilterReady = async (indexUrl?: string) => {
  if (filterRuntime) {
    return filterRuntime;
  }
  if (!indexUrl) {
    throw new Error("筛选索引未初始化");
  }

  const payload = await loadJson<RawFilterIndex>(indexUrl);
  filterRuntime = createFilterRuntime(payload);
  return filterRuntime;
};

const getAllTags = (runtime: FilterRuntime) =>
  Object.keys(runtime.tagIndex).sort((left, right) => left.localeCompare(right, "zh-CN"));

const parseDateFilter = (dateValue?: string) => {
  if (!dateValue || dateValue === "all") {
    return { startTime: null as number | null, endTime: null as number | null };
  }

  const [startDate = "", endDate = ""] = dateValue.split(",");
  const startTime = startDate ? Date.parse(`${startDate}T00:00:00Z`) : null;
  const endTime = endDate ? Date.parse(`${endDate}T23:59:59Z`) : null;

  return {
    startTime: Number.isNaN(startTime ?? Number.NaN) ? null : startTime,
    endTime: Number.isNaN(endTime ?? Number.NaN) ? null : endTime,
  };
};

const sortArticles = (articles: ArticleMetadata[], sort: string) => {
  const byDate = (article: ArticleMetadata) => Date.parse(article.date || "") || 0;
  const byUpdated = (article: ArticleMetadata) =>
    Date.parse(article.updated_at || article.date || "") || byDate(article);

  switch (sort) {
    case "oldest":
      articles.sort((left, right) => byDate(left) - byDate(right));
      break;
    case "updated_desc":
      articles.sort((left, right) => byUpdated(right) - byUpdated(left));
      break;
    case "updated_asc":
      articles.sort((left, right) => byUpdated(left) - byUpdated(right));
      break;
    case "title_asc":
      articles.sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
      break;
    case "title_desc":
      articles.sort((left, right) => right.title.localeCompare(left.title, "zh-CN"));
      break;
    default:
      articles.sort((left, right) => byDate(right) - byDate(left));
      break;
  }
};

const filterArticles = (runtime: FilterRuntime, request: FilterRequest): FilterResult => {
  const candidateIds = new Set(runtime.articles.map((_, index) => index));

  if (Array.isArray(request.tags) && request.tags.length > 0) {
    const tagCandidates = new Set<number>();
    for (const tag of request.tags) {
      for (const articleIndex of runtime.tagIndex[tag] || []) {
        tagCandidates.add(articleIndex);
      }
    }
    for (const candidateId of [...candidateIds]) {
      if (!tagCandidates.has(candidateId)) {
        candidateIds.delete(candidateId);
      }
    }
  }

  const { startTime, endTime } = parseDateFilter(request.date);
  if (startTime !== null || endTime !== null) {
    for (const candidateId of [...candidateIds]) {
      const articleTime = Date.parse(runtime.articles[candidateId]?.date || "");
      if (
        Number.isNaN(articleTime)
        || (startTime !== null && articleTime < startTime)
        || (endTime !== null && articleTime > endTime)
      ) {
        candidateIds.delete(candidateId);
      }
    }
  }

  const filteredArticles = [...candidateIds]
    .map((articleIndex) => runtime.articles[articleIndex])
    .filter(Boolean);

  sortArticles(filteredArticles, request.sort || "newest");

  const page = Math.max(1, request.page || 1);
  const limit = Math.max(1, request.limit || 12);
  const total = filteredArticles.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(total, startIndex + limit);

  return {
    articles: startIndex < total ? filteredArticles.slice(startIndex, endIndex) : [],
    total,
    page: currentPage,
    limit,
    total_pages: totalPages,
  };
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type } = event.data;

  try {
    switch (type) {
      case "initFilter": {
        await ensureFilterReady(event.data.payload.indexUrl);
        respond(id, { ready: true });
        return;
      }
      case "filter": {
        const runtime = await ensureFilterReady();
        respond(id, filterArticles(runtime, event.data.payload.request));
        return;
      }
      case "getTags": {
        const runtime = await ensureFilterReady();
        respond(id, getAllTags(runtime));
        return;
      }
      default: {
        respondError(id, `未知消息类型: ${String(type)}`);
      }
    }
  } catch (error) {
    respondError(id, error);
  }
};
