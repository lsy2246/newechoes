type SearchRequest = {
  query: string;
  search_type: string;
  page_size: number;
  page: number;
};

type WorkerRequest =
  | { id: number; type: "initSearch"; payload: { indexUrl: string } }
  | { id: number; type: "search"; payload: { request: SearchRequest } }
  | { id: number; type: "suggest"; payload: { request: SearchRequest } };

type WorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

type Heading = {
  level: number;
  text: string;
  position?: number;
  end_position?: number | null;
};

type ArticleMetadata = {
  id: string;
  title: string;
  summary: string;
  date: string;
  updated_at?: string | null;
  tags: string[];
  url: string;
  content?: string;
  page_type?: string;
  headings?: Heading[];
};

type RawSearchIndex = {
  title_term_index: Record<string, number[]>;
  articles: ArticleMetadata[];
  heading_term_index: Record<string, string[]>;
  common_terms: Record<string, number>;
  content_term_index: Record<string, number[]>;
};

type HeadingIndexEntry = {
  id: string;
  articleId: string;
  level: number;
  text: string;
  startPosition: number;
  endPosition: number;
  parentId: string | null;
  childrenIds: string[];
};

type SearchSuggestion = {
  text: string;
  suggestion_type: "completion" | "correction";
  matched_text: string;
  suggestion_text: string;
};

type HeadingNode = {
  id: string;
  text: string;
  level: number;
  content?: string;
  matched_terms?: string[];
  children: HeadingNode[];
};

type SearchResultItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  score: number;
  heading_tree?: HeadingNode | null;
  page_type: string;
};

type SearchResult = {
  items: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  time_ms: number;
  query: string;
  suggestions: SearchSuggestion[];
};

type SearchRuntime = {
  articles: ArticleMetadata[];
  titleTermIndex: Record<string, number[]>;
  headingTermIndex: Record<string, string[]>;
  commonTerms: Record<string, number>;
  contentTermIndex: Record<string, number[]>;
  articleIdToIndex: Map<string, number>;
  headingIndex: Map<string, HeadingIndexEntry>;
};

let searchRuntime: SearchRuntime | null = null;

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
    throw new Error(`获取搜索索引失败: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderHighlightedText = (source: string, query: string) => {
  if (!source || !query) {
    return escapeHtml(source);
  }

  const normalizedSource = source.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let cursor = 0;
  let result = "";

  while (cursor < source.length) {
    const foundIndex = normalizedSource.indexOf(normalizedQuery, cursor);
    if (foundIndex < 0) {
      result += escapeHtml(source.slice(cursor));
      break;
    }

    const matchEnd = foundIndex + query.length;
    result += escapeHtml(source.slice(cursor, foundIndex));
    result += `<mark>${escapeHtml(source.slice(foundIndex, matchEnd))}</mark>`;
    cursor = matchEnd;
  }

  return result || escapeHtml(source);
};

const splitQueryToTerms = (query: string) => {
  const cleanQuery = normalizeText(query);
  return cleanQuery ? [cleanQuery] : [];
};

const levenshteinDistance = (left: string, right: string) => {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);

  if (leftChars.length === 0) return rightChars.length;
  if (rightChars.length === 0) return leftChars.length;

  const matrix = Array.from({ length: leftChars.length + 1 }, () =>
    Array<number>(rightChars.length + 1).fill(0),
  );

  for (let row = 0; row <= leftChars.length; row += 1) {
    matrix[row][0] = row;
  }
  for (let column = 0; column <= rightChars.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= leftChars.length; row += 1) {
    for (let column = 1; column <= rightChars.length; column += 1) {
      const cost = leftChars[row - 1] === rightChars[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[leftChars.length][rightChars.length];
};

const deriveHeadingIndex = (articles: ArticleMetadata[]) => {
  const headingIndex = new Map<string, HeadingIndexEntry>();

  for (const article of articles) {
    const sourceHeadings = Array.isArray(article.headings) ? article.headings : [];
    const content = article.content || "";
    const contentLower = content.toLowerCase();
    const entries: HeadingIndexEntry[] = [];
    const stack: HeadingIndexEntry[] = [];
    let searchCursor = 0;

    sourceHeadings.forEach((heading, index) => {
      const text = `${heading.text || ""}`.trim();
      if (!text) {
        return;
      }

      const normalizedHeading = text.toLowerCase();
      let startPosition = contentLower.indexOf(normalizedHeading, searchCursor);
      if (startPosition < 0) {
        startPosition = contentLower.indexOf(normalizedHeading);
      }
      if (startPosition < 0) {
        startPosition = Math.max(0, searchCursor);
      }

      const entry: HeadingIndexEntry = {
        id: `${article.id}:${index}`,
        articleId: article.id,
        level: Number(heading.level) || 1,
        text,
        startPosition,
        endPosition: content.length,
        parentId: null,
        childrenIds: [],
      };

      searchCursor = startPosition + text.length;

      while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) {
        stack.pop();
      }

      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        entry.parentId = parent.id;
        parent.childrenIds.push(entry.id);
      }

      entries.push(entry);
      stack.push(entry);
    });

    entries.forEach((entry, index) => {
      entry.endPosition =
        index + 1 < entries.length ? entries[index + 1].startPosition : content.length;
      headingIndex.set(entry.id, entry);
    });
  }

  return headingIndex;
};

const createSearchRuntime = (payload: RawSearchIndex): SearchRuntime => ({
  articles: Array.isArray(payload.articles) ? payload.articles : [],
  titleTermIndex: payload.title_term_index || {},
  headingTermIndex: payload.heading_term_index || {},
  commonTerms: payload.common_terms || {},
  contentTermIndex: payload.content_term_index || {},
  articleIdToIndex: new Map(
    (Array.isArray(payload.articles) ? payload.articles : []).map((article, index) => [
      article.id,
      index,
    ]),
  ),
  headingIndex: deriveHeadingIndex(Array.isArray(payload.articles) ? payload.articles : []),
});

const ensureSearchReady = async (indexUrl?: string) => {
  if (searchRuntime) {
    return searchRuntime;
  }
  if (!indexUrl) {
    throw new Error("搜索索引未初始化");
  }

  const payload = await loadJson<RawSearchIndex>(indexUrl);
  searchRuntime = createSearchRuntime(payload);
  return searchRuntime;
};

const extractArticleIdFromHeading = (headingId: string) => {
  const splitIndex = headingId.lastIndexOf(":");
  return splitIndex >= 0 ? headingId.slice(0, splitIndex) : headingId;
};

const getSearchSuggestions = (runtime: SearchRuntime, query: string): SearchSuggestion[] => {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return Object.entries(runtime.commonTerms)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([term]) => ({
        text: term,
        suggestion_type: "completion",
        matched_text: "",
        suggestion_text: term,
      }));
  }

  const candidates = new Map<
    string,
    { text: string; score: number; frequency: number; suggestionType: "completion" | "correction" }
  >();

  const pushCandidate = (
    text: string,
    score: number,
    frequency: number,
    suggestionType: "completion" | "correction",
  ) => {
    const key = text.toLowerCase();
    if (key === normalizedQuery) {
      return;
    }

    const current = candidates.get(key);
    if (
      current
      && (current.score > score
        || (current.score === score && current.frequency >= frequency))
    ) {
      return;
    }

    candidates.set(key, {
      text,
      score,
      frequency,
      suggestionType,
    });
  };

  for (const article of runtime.articles) {
    const titleLower = article.title.toLowerCase();

    if (titleLower.startsWith(normalizedQuery)) {
      pushCandidate(article.title, 100, 100, "completion");
    } else if (titleLower.includes(normalizedQuery)) {
      pushCandidate(article.title, 90, 90, "correction");
    }
  }

  for (const [term, frequency] of Object.entries(runtime.commonTerms)) {
    const termLower = term.toLowerCase();

    if (termLower.startsWith(normalizedQuery)) {
      pushCandidate(term, 95, frequency, "completion");
    } else if (termLower.includes(normalizedQuery)) {
      pushCandidate(term, 85, frequency, "correction");
    }
  }

  if (candidates.size < 5) {
    for (const [term, frequency] of Object.entries(runtime.commonTerms)) {
      const termLower = term.toLowerCase();
      const distance = levenshteinDistance(normalizedQuery, termLower);
      const maxAllowedDistance = Math.min(normalizedQuery.length, 3);

      if (distance <= maxAllowedDistance) {
        pushCandidate(term, 80 - distance * 5, frequency, "correction");
      }
    }
  }

  return [...candidates.values()]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.frequency - left.frequency;
    })
    .slice(0, 10)
    .map((candidate) => {
      const textLower = candidate.text.toLowerCase();
      const isCompletion =
        candidate.suggestionType === "completion" && textLower.startsWith(normalizedQuery);

      return {
        text: candidate.text,
        suggestion_type: candidate.suggestionType,
        matched_text: isCompletion
          ? candidate.text.slice(0, normalizedQuery.length)
          : normalizedQuery,
        suggestion_text: isCompletion
          ? candidate.text.slice(normalizedQuery.length)
          : candidate.text,
      };
    });
};

const performAutocomplete = (runtime: SearchRuntime, req: SearchRequest): SearchResult => {
  const query = normalizeText(req.query);

  if (!query) {
    return {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 0,
      time_ms: 0,
      query,
      suggestions: [],
    };
  }

  const suggestions = getSearchSuggestions(runtime, query);

  return {
    items: [],
    total: suggestions.length,
    page: 1,
    page_size: suggestions.length,
    total_pages: 1,
    time_ms: 0,
    query,
    suggestions,
  };
};

const findMatchedArticles = (runtime: SearchRuntime, terms: string[]) => {
  if (terms.length === 0) {
    return [] as Array<[number, number]>;
  }

  const query = terms[0];
  const seenArticles = new Set<number>();
  const matchedArticles: Array<[number, number]> = [];

  const pushMatch = (articleIndex: number, score: number) => {
    if (seenArticles.has(articleIndex) || articleIndex >= runtime.articles.length) {
      return;
    }
    seenArticles.add(articleIndex);
    matchedArticles.push([articleIndex, score]);
  };

  runtime.articles.forEach((article, articleIndex) => {
    const titleLower = article.title.toLowerCase();
    if (titleLower.startsWith(query) && titleLower !== query) {
      pushMatch(articleIndex, 115);
    }
  });

  runtime.articles.forEach((article, articleIndex) => {
    if (seenArticles.has(articleIndex)) {
      return;
    }
    if (article.title.toLowerCase().includes(query)) {
      pushMatch(articleIndex, 99);
    }
  });

  runtime.articles.forEach((article, articleIndex) => {
    if (seenArticles.has(articleIndex)) {
      return;
    }
    if (article.title.toLowerCase() === query) {
      pushMatch(articleIndex, 90);
    }
  });

  for (const articleIndex of runtime.titleTermIndex[query] || []) {
    pushMatch(articleIndex, 85);
  }

  for (const headingId of runtime.headingTermIndex[query] || []) {
    const articleId = extractArticleIdFromHeading(headingId);
    const articleIndex = runtime.articleIdToIndex.get(articleId);
    if (typeof articleIndex === "number") {
      pushMatch(articleIndex, 80);
    }
  }

  for (const articleIndex of runtime.contentTermIndex[query] || []) {
    pushMatch(articleIndex, 75);
  }

  if (matchedArticles.length === 0) {
    runtime.articles.forEach((article, articleIndex) => {
      if ((article.content || "").toLowerCase().includes(query)) {
        matchedArticles.push([articleIndex, 50]);
      }
    });
  }

  matchedArticles.sort((left, right) => right[1] - left[1]);
  return matchedArticles;
};

const findMatchesInParagraph = (
  article: ArticleMetadata,
  heading: HeadingIndexEntry,
  terms: string[],
) => {
  const content = article.content || "";
  if (!content || terms.length === 0) {
    return null;
  }

  const contentStart = Math.min(content.length, heading.startPosition + heading.text.length);
  const contentEnd = Math.min(content.length, Math.max(contentStart, heading.endPosition));
  const paragraph = content.slice(contentStart, contentEnd).trim();
  if (!paragraph) {
    return null;
  }

  const query = terms[0].toLowerCase();
  const normalizedParagraph = paragraph.toLowerCase();
  const positions: Array<[number, number]> = [];
  let cursor = 0;

  while (cursor < paragraph.length) {
    const foundIndex = normalizedParagraph.indexOf(query, cursor);
    if (foundIndex < 0) {
      break;
    }
    positions.push([foundIndex, foundIndex + query.length]);
    cursor = foundIndex + query.length;
  }

  if (positions.length === 0) {
    return null;
  }

  const [firstStart, firstEnd] = positions[0];
  const snippetStart = paragraph.length > 300 ? Math.max(0, firstStart - 150) : 0;
  const snippetEnd = paragraph.length > 300
    ? Math.min(paragraph.length, firstEnd + 150)
    : paragraph.length;
  const snippet = paragraph.slice(snippetStart, snippetEnd);
  const visiblePositions = positions
    .filter(([start, end]) => start >= snippetStart && end <= snippetEnd)
    .map(([start, end]) => [start - snippetStart, end - snippetStart] as [number, number]);

  let highlighted = "";
  let lastPosition = 0;

  for (const [start, end] of visiblePositions) {
    highlighted += escapeHtml(snippet.slice(lastPosition, start));
    highlighted += `<mark>${escapeHtml(snippet.slice(start, end))}</mark>`;
    lastPosition = end;
  }

  highlighted += escapeHtml(snippet.slice(lastPosition));

  if (snippetStart > 0) {
    highlighted = `...${highlighted}`;
  }
  if (snippetEnd < paragraph.length) {
    highlighted = `${highlighted}...`;
  }

  return {
    content: highlighted,
    matchedTerms: [terms[0]],
  };
};

const buildHeadingTreeWithMatches = (
  runtime: SearchRuntime,
  article: ArticleMetadata,
  terms: string[],
): HeadingNode | null => {
  const content = article.content || "";
  if (!content || terms.length === 0) {
    return null;
  }

  const articleHeadings = [...runtime.headingIndex.values()]
    .filter((entry) => entry.articleId === article.id)
    .sort((left, right) => left.startPosition - right.startPosition);

  if (articleHeadings.length === 0) {
    const rootEntry: HeadingIndexEntry = {
      id: `${article.id}:root`,
      articleId: article.id,
      level: 0,
      text: article.title,
      startPosition: 0,
      endPosition: content.length,
      parentId: null,
      childrenIds: [],
    };
    const match = findMatchesInParagraph(article, rootEntry, terms);
    if (!match) {
      return null;
    }

    return {
      id: rootEntry.id,
      text: escapeHtml(rootEntry.text),
      level: 0,
      content: match.content,
      matched_terms: match.matchedTerms,
      children: [],
    };
  }

  const headingMap = new Map(articleHeadings.map((entry) => [entry.id, entry]));
  const headingMatches = new Map<
    string,
    { content: string; matchedTerms: string[] }
  >();

  for (const heading of articleHeadings) {
    const match = findMatchesInParagraph(article, heading, terms);
    if (match) {
      headingMatches.set(heading.id, match);
    }
  }

  const rootEntry: HeadingIndexEntry = {
    id: `${article.id}:root`,
    articleId: article.id,
    level: 0,
    text: article.title,
    startPosition: 0,
    endPosition: content.length,
    parentId: null,
    childrenIds: articleHeadings
      .filter((entry) => !entry.parentId)
      .map((entry) => entry.id),
  };

  const rootMatch = findMatchesInParagraph(article, rootEntry, terms);

  const buildNode = (heading: HeadingIndexEntry): HeadingNode | null => {
    const children = heading.childrenIds
      .map((childId) => {
        const child = headingMap.get(childId);
        return child ? buildNode(child) : null;
      })
      .filter(Boolean) as HeadingNode[];

    const match = headingMatches.get(heading.id);
    if (!match && children.length === 0) {
      return null;
    }

    return {
      id: heading.id,
      text: escapeHtml(heading.text),
      level: heading.level,
      content: match?.content,
      matched_terms: match?.matchedTerms,
      children,
    };
  };

  const children = rootEntry.childrenIds
    .map((childId) => {
      const child = headingMap.get(childId);
      return child ? buildNode(child) : null;
    })
    .filter(Boolean) as HeadingNode[];

  if (!rootMatch && children.length === 0) {
    return null;
  }

  return {
    id: rootEntry.id,
    text: escapeHtml(rootEntry.text),
    level: 0,
    content: rootMatch?.content,
    matched_terms: rootMatch?.matchedTerms,
    children,
  };
};

const performSearch = (runtime: SearchRuntime, req: SearchRequest): SearchResult => {
  const query = normalizeText(req.query);

  if (!query) {
    return {
      items: [],
      total: 0,
      page: req.page,
      page_size: req.page_size,
      total_pages: 0,
      time_ms: 0,
      query,
      suggestions: [],
    };
  }

  const terms = splitQueryToTerms(query);
  const allItems = findMatchedArticles(runtime, terms).map(([articleIndex, score]) => {
    const article = runtime.articles[articleIndex];
    return {
      id: article.id,
      title: renderHighlightedText(article.title, terms[0]),
      summary: article.summary,
      url: article.url,
      score,
      heading_tree: buildHeadingTreeWithMatches(runtime, article, terms),
      page_type: article.page_type || "article",
    } satisfies SearchResultItem;
  });

  const total = allItems.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / req.page_size);
  const startIndex = Math.max(0, (req.page - 1) * req.page_size);
  const endIndex = Math.min(total, startIndex + req.page_size);

  return {
    items: startIndex < total ? allItems.slice(startIndex, endIndex) : [],
    total,
    page: req.page,
    page_size: req.page_size,
    total_pages: totalPages,
    time_ms: 0,
    query,
    suggestions: getSearchSuggestions(runtime, query),
  };
};

const runSearch = (runtime: SearchRuntime, req: SearchRequest) =>
  req.search_type === "autocomplete"
    ? performAutocomplete(runtime, req)
    : performSearch(runtime, req);

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type } = event.data;

  try {
    switch (type) {
      case "initSearch": {
        await ensureSearchReady(event.data.payload.indexUrl);
        respond(id, { ready: true });
        return;
      }
      case "search":
      case "suggest": {
        const runtime = await ensureSearchReady();
        const startedAt = performance.now();
        const result = runSearch(runtime, event.data.payload.request);
        result.time_ms = Math.round(performance.now() - startedAt);
        respond(id, result);
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
