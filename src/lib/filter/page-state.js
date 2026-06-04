function clampPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveFilterPageState({
  requestedPage,
  totalArticles,
  totalPages,
  pageArticles,
}) {
  const effectiveTotalPages = Math.max(1, clampPositiveInteger(totalPages, 1));
  const normalizedRequestedPage = clampPositiveInteger(requestedPage, 1);
  const effectivePage = Math.min(normalizedRequestedPage, effectiveTotalPages);
  const articleCount = Array.isArray(pageArticles) ? pageArticles.length : 0;
  const hasResults = Number(totalArticles) > 0;

  return {
    effectivePage,
    shouldRefetch:
      hasResults && articleCount === 0 && normalizedRequestedPage !== effectivePage,
    shouldShowEmptyState: !hasResults,
  };
}
