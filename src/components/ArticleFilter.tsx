import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  filterArticles as workerFilterArticles,
  getAllTags as workerGetAllTags,
  initFilterIndex,
} from "@/lib/wasmWorkerClient";

interface FilterState {
  tags: string[];
  sort: string;
  pageSize: number;
  currentPage: number;
  date: string;
}

interface Article {
  title: string;
  url: string;
  date: string;
  summary?: string;
  tags?: string[];
}

interface FilterResult {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface ArticleFilterProps {
  searchParams?: Record<string, string> | URLSearchParams;
  articleUpdatedAt?: Record<string, string>;
}

type FilterMenu = "tags" | "date" | "view";

const DEFAULT_FILTERS: FilterState = {
  tags: [],
  sort: "newest",
  pageSize: 12,
  currentPage: 1,
  date: "all",
};

const sortLabels: Record<string, string> = {
  newest: "最新发布",
  oldest: "最早发布",
  updated_desc: "最近修改",
  updated_asc: "最早修改",
  title_asc: "标题 A-Z",
  title_desc: "标题 Z-A",
};

const pageSizeOptions = [12, 24, 36, 48];

const datePresets = [
  { value: "all", label: "全部" },
  { value: "last-7", label: "最近 7 天" },
  { value: "last-30", label: "最近 30 天" },
  { value: "last-90", label: "最近 90 天" },
  { value: "this-year", label: "今年" },
  { value: "last-year", label: "去年" },
  { value: "last-365", label: "最近一年" },
];

const YEAR_OPTION_COUNT = 8;
const MONTH_OPTION_COUNT = 12;

function getInitialFilters(searchParams: ArticleFilterProps["searchParams"]) {
  const readParam = (key: string) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get(key) || "";
    }

    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) || "";
    }

    return searchParams?.[key] || "";
  };

  const tags = readParam("tags").split(",").filter(Boolean);
  const sort = readParam("sort") || DEFAULT_FILTERS.sort;
  const pageSize = Number.parseInt(readParam("limit"), 10) || DEFAULT_FILTERS.pageSize;
  const currentPage = Number.parseInt(readParam("page"), 10) || DEFAULT_FILTERS.currentPage;
  const startDate = readParam("startDate");
  const endDate = readParam("endDate");

  return {
    tags,
    sort,
    pageSize,
    currentPage,
    date: startDate || endDate ? `${startDate},${endDate}` : DEFAULT_FILTERS.date,
  };
}

function formatDate(date: string) {
  if (!date) return "无日期";

  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getDateRange(date: string): [string, string] {
  if (!date || date === "all") return ["", ""];
  const [startDate = "", endDate = ""] = date.split(",");
  return [startDate, endDate];
}

function formatDateInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getDatePresetRange(preset: string): [string, string] {
  const today = new Date();
  const endDate = formatDateInput(today);

  if (preset === "all") return ["", ""];
  if (preset === "last-7") return [formatDateInput(addDays(today, -6)), endDate];
  if (preset === "last-30") return [formatDateInput(addDays(today, -29)), endDate];
  if (preset === "last-90") return [formatDateInput(addDays(today, -89)), endDate];

  if (preset === "this-year") {
    return [`${today.getFullYear()}-01-01`, endDate];
  }

  if (preset === "last-year") {
    const lastYear = today.getFullYear() - 1;
    return [`${lastYear}-01-01`, `${lastYear}-12-31`];
  }

  if (preset === "last-365") {
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    return [formatDateInput(startDate), endDate];
  }

  return ["", ""];
}

function makeDateFilterValue(startDate: string, endDate: string) {
  return startDate || endDate ? `${startDate},${endDate}` : "all";
}

function getYearRange(year: number): [string, string] {
  return [`${year}-01-01`, `${year}-12-31`];
}

function getMonthRange(year: number, month: number): [string, string] {
  const monthLabel = String(month + 1).padStart(2, "0");
  const endDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, "0");

  return [`${year}-${monthLabel}-01`, `${year}-${monthLabel}-${endDay}`];
}

function getMonthLabel(year: number, month: number) {
  return `${year}.${String(month + 1).padStart(2, "0")}`;
}

function getDateLabel(date: string) {
  const [startDate, endDate] = getDateRange(date);

  if (!startDate && !endDate) {
    return "全部";
  }

  const activePreset = datePresets.find((preset) => {
    const [presetStart, presetEnd] = getDatePresetRange(preset.value);
    return presetStart === startDate && presetEnd === endDate;
  });

  if (activePreset) {
    return activePreset.label;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (
    startDate &&
    endDate &&
    startDate === `${start.getFullYear()}-01-01` &&
    endDate === `${start.getFullYear()}-12-31`
  ) {
    return `${start.getFullYear()} 年`;
  }

  if (
    startDate &&
    endDate &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    startDate.endsWith("-01") &&
    endDate === getMonthRange(start.getFullYear(), start.getMonth())[1]
  ) {
    return getMonthLabel(start.getFullYear(), start.getMonth());
  }

  if (startDate && endDate) {
    return `${startDate} / ${endDate}`;
  }

  return startDate ? `${startDate} 之后` : `${endDate} 之前`;
}

function buildFilterUrl(filters: FilterState) {
  const params = new URLSearchParams();

  if (filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }

  if (filters.sort !== DEFAULT_FILTERS.sort) {
    params.set("sort", filters.sort);
  }

  const [startDate, endDate] = getDateRange(filters.date);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  if (filters.pageSize !== DEFAULT_FILTERS.pageSize) {
    params.set("limit", String(filters.pageSize));
  }

  if (filters.currentPage > 1) {
    params.set("page", String(filters.currentPage));
  }

  return params.toString();
}

function articleLinkWithReturnFilter(articleUrl: string) {
  if (typeof window === "undefined" || !window.location.search) {
    return articleUrl;
  }

  const connector = articleUrl.includes("?") ? "&" : "?";
  return `${articleUrl}${connector}return_filter=${btoa(
    encodeURIComponent(JSON.stringify(Object.fromEntries(new URLSearchParams(window.location.search)))),
  )}`;
}

function isUpdatedSort(sort: string) {
  return sort === "updated_desc" || sort === "updated_asc";
}

function articleUpdatedAt(article: Article, updatedAtByUrl: Map<string, string>) {
  const candidates = [
    article.url,
    decodeURI(article.url),
    encodeURI(decodeURI(article.url)),
  ];

  const updatedAt = candidates
    .map((url) => updatedAtByUrl.get(url))
    .find(Boolean);
  const updatedTime = Date.parse(updatedAt || "");
  if (!Number.isNaN(updatedTime)) {
    return updatedTime;
  }

  const publishedTime = Date.parse(article.date);
  return Number.isNaN(publishedTime) ? 0 : publishedTime;
}

function sortArticlesByUpdatedTime(
  articles: Article[],
  sort: string,
  updatedAtByUrl: Map<string, string>,
) {
  const direction = sort === "updated_asc" ? 1 : -1;

  return [...articles].sort((leftArticle, rightArticle) => {
    const updatedDifference =
      articleUpdatedAt(leftArticle, updatedAtByUrl) -
      articleUpdatedAt(rightArticle, updatedAtByUrl);

    if (updatedDifference !== 0) {
      return updatedDifference * direction;
    }

    return rightArticle.date.localeCompare(leftArticle.date);
  });
}

const ArticleFilter: React.FC<ArticleFilterProps> = ({
  searchParams = {},
  articleUpdatedAt: articleUpdatedAtMap = {},
}) => {
  const [filters, setFilters] = useState<FilterState>(() =>
    getInitialFilters(searchParams),
  );
  const [articles, setArticles] = useState<Article[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenu | null>(null);
  const filterConsoleRef = useRef<HTMLDivElement | null>(null);
  const isReadyRef = useRef(false);
  const updatedAtByUrl = useMemo(
    () => new Map(Object.entries(articleUpdatedAtMap)),
    [articleUpdatedAtMap],
  );

  const runFilter = useCallback(async (nextFilters: FilterState) => {
    if (!isReadyRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = (await workerFilterArticles({
        tags: nextFilters.tags,
        sort: isUpdatedSort(nextFilters.sort) ? "newest" : nextFilters.sort,
        date: nextFilters.date,
        page: nextFilters.currentPage,
        limit: nextFilters.pageSize,
      })) as FilterResult;

      const total = typeof result?.total === "number"
        ? result.total
        : Array.isArray(result?.articles)
          ? result.articles.length
          : 0;
      let nextArticles = Array.isArray(result?.articles) ? result.articles : [];
      let nextTotalPages =
        typeof result?.total_pages === "number" && result.total_pages > 0
          ? result.total_pages
          : Math.max(1, Math.ceil(total / nextFilters.pageSize));

      if (isUpdatedSort(nextFilters.sort)) {
        const allResult = (await workerFilterArticles({
          tags: nextFilters.tags,
          sort: isUpdatedSort(nextFilters.sort) ? "newest" : nextFilters.sort,
          date: nextFilters.date,
          page: 1,
          limit: Math.max(total, 1),
        })) as FilterResult;
        const allArticles = Array.isArray(allResult?.articles)
          ? allResult.articles
          : [];
        const sortedArticles = sortArticlesByUpdatedTime(allArticles, nextFilters.sort, updatedAtByUrl);
        const pageStart = (nextFilters.currentPage - 1) * nextFilters.pageSize;

        nextArticles = sortedArticles.slice(pageStart, pageStart + nextFilters.pageSize);
        nextTotalPages = Math.max(1, Math.ceil(total / nextFilters.pageSize));
      }

      setArticles(nextArticles);
      setTotalArticles(total);
      setTotalPages(nextTotalPages);
    } catch (filterError) {
      console.error("[ArticleFilter] 筛选失败:", filterError);
      setError("筛选文章时出错，请刷新页面重试");
      setArticles([]);
      setTotalArticles(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [updatedAtByUrl]);

  const updateFilters = useCallback(
    (patch: Partial<FilterState>, options: { resetPage?: boolean } = {}) => {
      setFilters((current) => {
        const nextFilters = {
          ...current,
          ...patch,
          currentPage: options.resetPage
            ? 1
            : patch.currentPage ?? current.currentPage,
        };

        if (typeof window !== "undefined") {
          const query = buildFilterUrl(nextFilters);
          window.history.pushState(
            {},
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}`,
          );
        }

        void runFilter(nextFilters);
        return nextFilters;
      });
    },
    [runFilter],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootFilter() {
      try {
        setIsLoading(true);
        await initFilterIndex("/index/filter_index.bin");
        if (cancelled) return;

        isReadyRef.current = true;
        const tags = (await workerGetAllTags()) as string[];
        if (cancelled) return;

        setAllTags(Array.isArray(tags) ? tags : []);
        await runFilter(filters);
      } catch (bootError) {
        console.error("[ArticleFilter] 初始化失败:", bootError);
        if (!cancelled) {
          setError("索引文件缺失或无法读取，请重新构建索引");
          setIsLoading(false);
        }
      }
    }

    void bootFilter();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!filterConsoleRef.current) {
        return;
      }

      if (!filterConsoleRef.current.contains(target)) {
        setOpenFilterMenu(null);
        return;
      }

      const targetElement = target instanceof Element ? target : target.parentElement;
      if (targetElement?.closest(".filter-disclosure")) {
        return;
      }

      setOpenFilterMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const [startDate, endDate] = getDateRange(filters.date);
  const dateRangeLabel = getDateLabel(filters.date);
  const today = new Date();
  const selectableYears = Array.from(
    { length: YEAR_OPTION_COUNT },
    (_, index) => today.getFullYear() - index,
  );
  const selectableMonths = Array.from({ length: MONTH_OPTION_COUNT }, (_, index) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - index, 1);

    return {
      label: getMonthLabel(monthDate.getFullYear(), monthDate.getMonth()),
      month: monthDate.getMonth(),
      year: monthDate.getFullYear(),
    };
  });
  const visibleSelectedTags = filters.tags.slice(0, 3);
  const hiddenSelectedTagCount = Math.max(0, filters.tags.length - visibleSelectedTags.length);
  const selectedTagSummary =
    filters.tags.length > 0
      ? `${visibleSelectedTags.map((tag) => `#${tag}`).join(" ")}${hiddenSelectedTagCount > 0 ? ` +${hiddenSelectedTagCount}` : ""}`
      : "全部标签";
  const normalizedTagSearch = tagSearch.trim().toLowerCase();
  const selectedTagSet = new Set(filters.tags);
  const filteredTags = allTags
    .filter((tag) => tag.toLowerCase().includes(normalizedTagSearch))
    .sort((firstTag, secondTag) => {
      const firstSelected = selectedTagSet.has(firstTag);
      const secondSelected = selectedTagSet.has(secondTag);

      if (firstSelected !== secondSelected) {
        return firstSelected ? -1 : 1;
      }

      return firstTag.localeCompare(secondTag, "zh-CN");
    });
  const resultStart =
    totalArticles === 0
      ? 0
      : (filters.currentPage - 1) * filters.pageSize + 1;
  const resultEnd = Math.min(filters.currentPage * filters.pageSize, totalArticles);
  const currentSortLabel = sortLabels[filters.sort] || sortLabels.newest;
  const viewLabel = `${currentSortLabel} · 每页 ${filters.pageSize}`;
  const resultStatusText = error
    ? error
    : isLoading
      ? "正在加载文章"
      : totalArticles > 0
        ? `共找到 ${totalArticles} 篇文章，第 ${resultStart}-${resultEnd} 篇`
        : "没有找到符合条件的文章";
  const hasActiveFilters =
    filters.tags.length > 0 ||
    filters.date !== DEFAULT_FILTERS.date ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.pageSize !== DEFAULT_FILTERS.pageSize;
  const activeFilterChips = [
    ...(filters.tags.length > 0 ? [{ key: "tags", label: selectedTagSummary }] : []),
    ...(filters.date !== DEFAULT_FILTERS.date ? [{ key: "date", label: dateRangeLabel }] : []),
    ...(filters.sort !== DEFAULT_FILTERS.sort ? [{ key: "sort", label: currentSortLabel }] : []),
    ...(filters.pageSize !== DEFAULT_FILTERS.pageSize ? [{ key: "pageSize", label: `每页 ${filters.pageSize}` }] : []),
  ];

  const updateDateRange = (nextStartDate: string, nextEndDate: string) => {
    updateFilters(
      { date: makeDateFilterValue(nextStartDate, nextEndDate) },
      { resetPage: true },
    );
  };

  const applyDatePreset = (preset: string) => {
    const [nextStartDate, nextEndDate] = getDatePresetRange(preset);
    updateDateRange(nextStartDate, nextEndDate);
  };

  const toggleTag = (tag: string) => {
    const isActive = selectedTagSet.has(tag);
    updateFilters(
      {
        tags: isActive
          ? filters.tags.filter((item) => item !== tag)
          : [...filters.tags, tag],
      },
      { resetPage: true },
    );
  };

  const resetFilters = () => {
    setTagSearch("");
    updateFilters(DEFAULT_FILTERS);
  };

  const syncFilterMenu = (menu: FilterMenu, isOpen: boolean) => {
    setOpenFilterMenu((currentMenu) => {
      if (isOpen) return menu;
      return currentMenu === menu ? null : currentMenu;
    });
  };

  return (
    <section className="filter-console-layout" aria-label="文章筛选">
      <div className="filter-console" ref={filterConsoleRef}>
        <div className="filter-control-grid">
          <div className="filter-control-cell">
            <span className="filter-control-label">标签</span>
            <details
              className="filter-disclosure filter-tag-disclosure"
              open={openFilterMenu === "tags"}
              onToggle={(event) => syncFilterMenu("tags", event.currentTarget.open)}
            >
              <summary className="line-select filter-control">
                <span className="filter-tag-summary">{selectedTagSummary}</span>
                <span className="filter-chevron" aria-hidden="true">∨</span>
              </summary>
              <div className="filter-drawer filter-tag-index">
                <input
                  id="filter-tag-search"
                  className="filter-tag-search"
                  type="search"
                  placeholder="搜索标签"
                  value={tagSearch}
                  onChange={(event) => setTagSearch(event.target.value)}
                  aria-label="搜索标签"
                />
                {filters.tags.length > 0 && (
                  <div className="filter-tags" aria-label="已选择标签">
                    {filters.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="filter-tag is-active"
                        onClick={() => toggleTag(tag)}
                      >
                        #{tag} ×
                      </button>
                    ))}
                    <button
                      type="button"
                      className="filter-clear-inline"
                      onClick={() => updateFilters({ tags: [] }, { resetPage: true })}
                    >
                      清除全部
                    </button>
                  </div>
                )}
                <div className="filter-tag-options" role="listbox" aria-label="标签列表">
                  {filteredTags.length > 0 ? (
                    filteredTags.map((tag) => {
                      const isActive = selectedTagSet.has(tag);

                      return (
                        <button
                          key={tag}
                          type="button"
                          className={isActive ? "filter-tag-option is-active" : "filter-tag-option"}
                          onClick={() => toggleTag(tag)}
                          aria-pressed={isActive}
                        >
                          <span>#{tag}</span>
                          <span className="filter-tag-state">{isActive ? "已选" : "选择"}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="filter-tag-empty">没有匹配标签</p>
                  )}
                </div>
              </div>
            </details>
          </div>

          <div className="filter-control-cell">
            <span className="filter-control-label">时间</span>
            <details
              className="filter-disclosure"
              open={openFilterMenu === "date"}
              onToggle={(event) => syncFilterMenu("date", event.currentTarget.open)}
            >
              <summary className="line-select filter-control">
                <span>{dateRangeLabel}</span>
                <span className="filter-chevron" aria-hidden="true">∨</span>
              </summary>
              <div className="filter-drawer filter-date-groups">
                <div className="filter-date-group">
                  <span className="filter-group-label">常用</span>
                  <div className="filter-option-grid filter-date-presets" aria-label="时间预设">
                    {datePresets.map((preset) => {
                      const [presetStart, presetEnd] = getDatePresetRange(preset.value);
                      const isActive = presetStart === startDate && presetEnd === endDate;

                      return (
                        <button
                          key={preset.value}
                          type="button"
                          className={isActive ? "filter-text-option is-active" : "filter-text-option"}
                          onClick={() => applyDatePreset(preset.value)}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="filter-date-group">
                  <span className="filter-group-label">年份</span>
                  <div className="filter-option-grid filter-date-years" aria-label="按年份筛选">
                    {selectableYears.map((year) => {
                      const [yearStart, yearEnd] = getYearRange(year);
                      const isActive = yearStart === startDate && yearEnd === endDate;

                      return (
                        <button
                          key={year}
                          type="button"
                          className={isActive ? "filter-text-option is-active" : "filter-text-option"}
                          onClick={() => updateDateRange(yearStart, yearEnd)}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="filter-date-group">
                  <span className="filter-group-label">月份</span>
                  <div className="filter-option-grid filter-date-months" aria-label="按月份筛选">
                    {selectableMonths.map(({ year, month, label }) => {
                      const [monthStart, monthEnd] = getMonthRange(year, month);
                      const isActive = monthStart === startDate && monthEnd === endDate;

                      return (
                        <button
                          key={label}
                          type="button"
                          className={isActive ? "filter-text-option is-active" : "filter-text-option"}
                          onClick={() => updateDateRange(monthStart, monthEnd)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div className="filter-control-cell">
            <span className="filter-control-label">排序</span>
            <details
              className="filter-disclosure filter-view-disclosure"
              open={openFilterMenu === "view"}
              onToggle={(event) => syncFilterMenu("view", event.currentTarget.open)}
            >
              <summary className="line-select filter-control">
                <span>{viewLabel}</span>
                <span className="filter-chevron" aria-hidden="true">∨</span>
              </summary>
              <div className="filter-drawer filter-view-options">
                <div className="filter-view-group">
                  <span className="filter-group-label">排序</span>
                  <div className="filter-option-grid" aria-label="排序方式">
                    {Object.entries(sortLabels).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={filters.sort === value ? "filter-text-option is-active" : "filter-text-option"}
                        onClick={() => updateFilters({ sort: value }, { resetPage: true })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-view-group">
                  <span className="filter-group-label">每页</span>
                  <div className="filter-option-grid" aria-label="每页显示">
                    {pageSizeOptions.map((pageSize) => (
                      <button
                        key={pageSize}
                        type="button"
                        className={filters.pageSize === pageSize ? "filter-text-option is-active" : "filter-text-option"}
                        onClick={() => updateFilters({ pageSize }, { resetPage: true })}
                      >
                        {pageSize}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>

          <button
            type="button"
            className="filter-reset-button"
            onClick={resetFilters}
            disabled={!hasActiveFilters && filters.currentPage <= 1}
          >
            重置筛选
          </button>
        </div>

        <div className="filter-active-strip" aria-label="当前筛选条件">
          <span className="filter-active-label">当前条件</span>
          {activeFilterChips.length > 0 ? (
            activeFilterChips.map((chip) => (
              <span key={chip.key} className="filter-active-chip">
                {chip.label}
              </span>
            ))
          ) : (
            <span className="filter-active-chip is-empty">全部文章</span>
          )}
        </div>
      </div>

      <section className="filter-results-panel" aria-live="polite">
        <p className="filter-status" role="status">
          {resultStatusText}
        </p>

        {articles.length > 0 ? (
          <div className="filter-result-list">
            {articles.map((article) => {
              const hasSummary = Boolean(article.summary);
              const firstTag = article.tags?.[0];
              const hiddenTagCount = Math.max(0, (article.tags?.length || 0) - 1);

              return (
                <a
                  key={article.url}
                  href={articleLinkWithReturnFilter(article.url)}
                  className={hasSummary ? "filter-result-link" : "filter-result-link no-summary"}
                  data-astro-prefetch="viewport"
                >
                  <span className="filter-result-kind">article</span>
                  <span className="filter-result-icon" aria-hidden="true">
                    <svg viewBox="0 0 40 44" fill="none">
                      <path d="M9 4h15l7 7v29H9V4Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M24 4v8h7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M14 20h12M14 26h12M14 32h7" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </span>
                  <div className="filter-result-copy">
                    <h2 className="filter-result-title">{article.title || "无标题"}</h2>
                    <p className="filter-result-summary" aria-hidden={!hasSummary}>
                      {article.summary || "暂无摘要"}
                    </p>
                    <div className="filter-result-meta">
                      <time dateTime={article.date}>{formatDate(article.date)}</time>
                      <span>{firstTag ? `#${firstTag}` : "#note"}</span>
                      {hiddenTagCount > 0 && <span>+{hiddenTagCount}</span>}
                    </div>
                  </div>
                  <span className="filter-result-cue" aria-hidden="true">阅读</span>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="article-index-empty">
            <h3>{isLoading ? "正在读取索引" : "没有找到符合条件的文章"}</h3>
            <p>{error || "尝试调整筛选条件，或者清除标签后重新查看。"}</p>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="filter-pagination" aria-label="筛选结果分页">
            <button
              type="button"
              disabled={filters.currentPage <= 1}
              onClick={() => updateFilters({ currentPage: filters.currentPage - 1 })}
            >
              上一页
            </button>
            <span>
              {filters.currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.currentPage >= totalPages}
              onClick={() => updateFilters({ currentPage: filters.currentPage + 1 })}
            >
              下一页
            </button>
          </nav>
        )}
      </section>
    </section>
  );
};

export default ArticleFilter;
