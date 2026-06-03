import { useCallback, useEffect, useMemo, useState } from "react";

import { scheduleSearchPrewarm, subscribeSearchPrewarm, accelerateSearchPrewarm } from "./prewarm";
import { searchArticles, suggestArticles } from "./client";
import type { SearchRequest, SearchResult, SearchWarmupStatus } from "./types";

type SearchControllerState = {
  status: SearchWarmupStatus;
  error: string | null;
};

type UseSearchControllerOptions = {
  placeholder: string;
};

export function useSearchController({ placeholder }: UseSearchControllerOptions) {
  const [state, setState] = useState<SearchControllerState>({
    status: "idle",
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeSearchPrewarm((snapshot) => {
      setState(snapshot);
    });

    scheduleSearchPrewarm();
    return unsubscribe;
  }, []);

  const isReady = state.status === "ready";
  const isWarming = state.status === "warming" || state.status === "idle";

  const placeholderText = useMemo(() => {
    if (state.status === "warming") {
      return "正在准备搜索...";
    }

    if (state.status === "error") {
      return "搜索暂时不可用";
    }

    return placeholder;
  }, [placeholder, state.status]);

  const ensureReady = useCallback(async (mode: "background" | "immediate" = "immediate") => {
    if (isReady) {
      return true;
    }

    try {
      if (mode === "background") {
        scheduleSearchPrewarm();
        return false;
      }

      await accelerateSearchPrewarm();
      return true;
    } catch {
      return false;
    }
  }, [isReady]);

  const runSearch = useCallback(async (request: SearchRequest): Promise<SearchResult> => {
    await ensureReady("immediate");
    return searchArticles(request);
  }, [ensureReady]);

  const runSuggest = useCallback(async (request: SearchRequest): Promise<SearchResult> => {
    await ensureReady("immediate");
    return suggestArticles(request);
  }, [ensureReady]);

  return {
    isReady,
    isWarming,
    status: state.status,
    error: state.error,
    placeholder: placeholderText,
    ensureReady,
    runSearch,
    runSuggest,
  };
}
