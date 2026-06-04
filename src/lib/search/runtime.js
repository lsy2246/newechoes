const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE = 1;

function normalizeString(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return normalizeString(value).match(/[\p{L}\p{N}][\p{L}\p{N}_-]*/gu) || [];
}

function toTimestamp(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function clampPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1).fill(0);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    current[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost,
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function sharedCharacterCount(left, right) {
  const rightCharacters = new Set(right);
  let score = 0;

  for (const character of new Set(left)) {
    if (rightCharacters.has(character)) {
      score += 1;
    }
  }

  return score;
}

function highlightTitle(title, query) {
  const source = String(title || "");
  const normalizedTitle = source.toLowerCase();
  const normalizedQuery = normalizeString(query);

  if (!source || !normalizedQuery) {
    return source;
  }

  let cursor = 0;
  let output = "";
  let matched = false;

  while (cursor < source.length) {
    const nextIndex = normalizedTitle.indexOf(normalizedQuery, cursor);
    if (nextIndex === -1) {
      output += source.slice(cursor);
      break;
    }

    matched = true;
    output += source.slice(cursor, nextIndex);
    output += `<mark>${source.slice(nextIndex, nextIndex + normalizedQuery.length)}</mark>`;
    cursor = nextIndex + normalizedQuery.length;
  }

  return matched ? output : source;
}

function createContentExcerpt(content, normalizedQuery) {
  const source = normalizeWhitespace(content);
  if (!source) return undefined;

  const normalizedContent = source.toLowerCase();
  const matchIndex = normalizedContent.indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return source.slice(0, 180);
  }

  const excerptStart = Math.max(0, matchIndex - 60);
  const excerptEnd = Math.min(source.length, matchIndex + normalizedQuery.length + 120);
  const prefix = excerptStart > 0 ? "..." : "";
  const suffix = excerptEnd < source.length ? "..." : "";
  const matchedSlice = source.slice(matchIndex, matchIndex + normalizedQuery.length);

  return `${prefix}${source.slice(excerptStart, matchIndex)}<mark>${matchedSlice}</mark>${source.slice(
    matchIndex + normalizedQuery.length,
    excerptEnd,
  )}${suffix}`;
}

function buildHeadingTree(article, normalizedQuery) {
  const headings = Array.isArray(article.headings) ? article.headings : [];
  if (!headings.length || !normalizedQuery) {
    return undefined;
  }

  const root = {
    id: `${article.id}:root`,
    text: article.title || "",
    level: 0,
    content: undefined,
    matched_terms: undefined,
    children: [],
  };
  const stack = [root];
  let hasMatch = false;
  const normalizedContent = normalizeString(article.content);

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const headingText = String(heading?.text || "");
    const level = clampPositiveInteger(heading?.level, 1);
    const start = clampPositiveInteger(heading?.position, 0);
    const endCandidate = Number.parseInt(String(heading?.end_position ?? ""), 10);
    const end = Number.isFinite(endCandidate) && endCandidate > start
      ? endCandidate
      : article.content?.length || start;
    const sectionContent = normalizeWhitespace(String(article.content || "").slice(start, end));
    const normalizedHeading = normalizeString(headingText);
    const normalizedSection = normalizeString(sectionContent);
    const matched =
      normalizedHeading.includes(normalizedQuery) || normalizedSection.includes(normalizedQuery);

    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const node = {
      id: `${article.id}:${index}`,
      text: headingText,
      level,
      content: matched
        ? createContentExcerpt(sectionContent || normalizedContent, normalizedQuery)
        : undefined,
      matched_terms: matched ? [normalizedQuery] : undefined,
      children: [],
    };

    stack[stack.length - 1].children.push(node);
    stack.push(node);

    if (matched) {
      hasMatch = true;
    }
  }

  return hasMatch ? root : undefined;
}

function buildCommonTerms(articles) {
  const frequencies = new Map();

  for (const article of articles) {
    const terms = [
      ...tokenize(article.title),
      ...tokenize(article.summary),
      ...tokenize(article.content),
      ...tokenize((article.tags || []).join(" ")),
      ...tokenize((article.headings || []).map((heading) => heading.text).join(" ")),
    ];

    for (const term of terms) {
      frequencies.set(term, (frequencies.get(term) || 0) + 1);
    }
  }

  return frequencies;
}

function prepareArticles(articles) {
  return articles.map((article) => {
    const title = String(article.title || "");
    const summary = String(article.summary || "");
    const content = String(article.content || "");
    const tags = Array.isArray(article.tags) ? article.tags : [];
    const headings = Array.isArray(article.headings) ? article.headings : [];
    const combinedText = normalizeString([
      title,
      summary,
      content,
      tags.join(" "),
      headings.map((heading) => heading.text).join(" "),
    ].join(" "));

    return {
      ...article,
      title,
      summary,
      content,
      tags,
      headings,
      page_type: article.page_type || "article",
      _normalizedTitle: normalizeString(title),
      _normalizedSummary: normalizeString(summary),
      _normalizedContent: normalizeString(content),
      _normalizedTags: tags.map((tag) => normalizeString(tag)).filter(Boolean),
      _combinedText: combinedText,
      _dateTimestamp: toTimestamp(article.date),
    };
  });
}

function getSuggestions(preparedArticles, commonTerms, query) {
  const normalizedQuery = normalizeString(query);
  if (!normalizedQuery) {
    return [];
  }

  const candidates = [];
  const seen = new Set();

  const pushCandidate = (candidate) => {
    const key = normalizeString(candidate.text);
    if (!key || key === normalizedQuery || seen.has(key)) {
      return;
    }

    seen.add(key);
    candidates.push(candidate);
  };

  for (const article of preparedArticles) {
    if (!article._normalizedTitle) continue;

    if (article._normalizedTitle.startsWith(normalizedQuery)) {
      pushCandidate({
        text: article.title,
        score: 100,
        suggestion_type: "completion",
        frequency: 100,
      });
      continue;
    }

    if (article._normalizedTitle.includes(normalizedQuery)) {
      pushCandidate({
        text: article.title,
        score: 90,
        suggestion_type: "correction",
        frequency: 90,
      });
    }
  }

  for (const [term, frequency] of commonTerms.entries()) {
    if (term.startsWith(normalizedQuery)) {
      pushCandidate({
        text: term,
        score: 95,
        suggestion_type: "completion",
        frequency,
      });
      continue;
    }

    if (term.includes(normalizedQuery)) {
      pushCandidate({
        text: term,
        score: 85,
        suggestion_type: "correction",
        frequency,
      });
    }
  }

  if (candidates.length < 5) {
    for (const [term, frequency] of commonTerms.entries()) {
      if (seen.has(term) || term === normalizedQuery) {
        continue;
      }

      if (term.length < Math.max(4, normalizedQuery.length)) {
        continue;
      }

      const distance = levenshteinDistance(normalizedQuery, term);
      const maxAllowedDistance = Math.min(normalizedQuery.length, 3);
      if (distance <= maxAllowedDistance) {
        const overlapScore = sharedCharacterCount(normalizedQuery, term) * 3;
        pushCandidate({
          text: term,
          score: 80 - distance * 5 + overlapScore,
          suggestion_type: "correction",
          frequency,
        });
      }
    }
  }

  candidates.sort((left, right) =>
    right.score - left.score || right.frequency - left.frequency || left.text.localeCompare(right.text));

  return candidates.slice(0, 10).map((candidate) => {
    const normalizedText = candidate.text.toLowerCase();
    const isCompletion =
      candidate.suggestion_type === "completion" && normalizedText.startsWith(normalizedQuery);

    return {
      text: candidate.text,
      suggestion_type: candidate.suggestion_type,
      matched_text: isCompletion ? candidate.text.slice(0, normalizedQuery.length) : normalizedQuery,
      suggestion_text: isCompletion
        ? candidate.text.slice(normalizedQuery.length)
        : candidate.text,
    };
  });
}

function findMatchedArticles(preparedArticles, query) {
  const normalizedQuery = normalizeString(query);
  if (!normalizedQuery) {
    return [];
  }

  const matches = [];

  for (const article of preparedArticles) {
    let score = 0;

    if (article._normalizedTitle.startsWith(normalizedQuery) && article._normalizedTitle !== normalizedQuery) {
      score = 115;
    } else if (article._normalizedTitle.includes(normalizedQuery)) {
      score = 99;
    } else if (article._normalizedTags.some((tag) => tag === normalizedQuery || tag.startsWith(normalizedQuery))) {
      score = 92;
    } else if (article._normalizedTags.some((tag) => tag.includes(normalizedQuery))) {
      score = 88;
    } else if (article._normalizedSummary.includes(normalizedQuery)) {
      score = 84;
    } else if (article._normalizedContent.includes(normalizedQuery)) {
      score = 80;
    } else {
      const tokens = tokenize(normalizedQuery);
      if (tokens.length > 1 && tokens.every((token) => article._combinedText.includes(token))) {
        score = 70;
      }
    }

    if (score > 0) {
      matches.push({ article, score });
    }
  }

  matches.sort((left, right) =>
    right.score - left.score
    || right.article._dateTimestamp - left.article._dateTimestamp
    || left.article.title.localeCompare(right.article.title, "zh-CN"));

  return matches;
}

export function createSearchRuntime(searchIndex) {
  const articles = prepareArticles(Array.isArray(searchIndex?.articles) ? searchIndex.articles : []);
  const commonTerms = buildCommonTerms(articles);

  const runSearch = (request = {}, searchType = "normal") => {
    const query = String(request.query || "");
    const page = clampPositiveInteger(request.page, DEFAULT_PAGE);
    const pageSize = clampPositiveInteger(request.page_size, DEFAULT_PAGE_SIZE);
    const normalizedQuery = normalizeString(query);
    const suggestions = getSuggestions(articles, commonTerms, normalizedQuery);

    if (!normalizedQuery) {
      return {
        items: [],
        total: 0,
        page,
        page_size: pageSize,
        total_pages: 0,
        time_ms: 0,
        query: normalizedQuery,
        suggestions,
      };
    }

    if (searchType === "autocomplete" || request.search_type === "autocomplete") {
      return {
        items: [],
        total: suggestions.length,
        page: 1,
        page_size: suggestions.length,
        total_pages: suggestions.length > 0 ? 1 : 0,
        time_ms: 0,
        query: normalizedQuery,
        suggestions,
      };
    }

    const matches = findMatchedArticles(articles, normalizedQuery);
    const total = matches.length;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = matches.slice(start, end).map(({ article, score }) => ({
      id: article.id,
      title: highlightTitle(article.title, normalizedQuery),
      summary: article.summary,
      url: article.url,
      score,
      heading_tree: buildHeadingTree(article, normalizedQuery),
      page_type: article.page_type || "article",
    }));

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      time_ms: 0,
      query: normalizedQuery,
      suggestions,
    };
  };

  return {
    search(request) {
      return runSearch(request, "normal");
    },
    suggest(request) {
      return runSearch(request, "autocomplete");
    },
  };
}
