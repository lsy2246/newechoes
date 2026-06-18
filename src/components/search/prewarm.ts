import { warmupSearchIndex } from "./client";
import type { SearchWarmupStatus } from "./types";

const SEARCH_INDEX_URL = "/assets/index/search_index.json";

type SearchPrewarmSnapshot = {
  status: SearchWarmupStatus;
  error: string | null;
};

type SearchPrewarmListener = (snapshot: SearchPrewarmSnapshot) => void;

let snapshot: SearchPrewarmSnapshot = {
  status: "idle",
  error: null,
};
let warmupPromise: Promise<void> | null = null;
let scheduled = false;
let timeoutHandle: number | null = null;
let idleHandle: number | null = null;
const listeners = new Set<SearchPrewarmListener>();

const notify = () => {
  listeners.forEach((listener) => listener(snapshot));
};

const setSnapshot = (nextSnapshot: SearchPrewarmSnapshot) => {
  snapshot = nextSnapshot;
  notify();
};

const cancelScheduledWarmup = () => {
  if (timeoutHandle !== null) {
    window.clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }

  if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(idleHandle);
    idleHandle = null;
  }

  scheduled = false;
};

const startWarmup = async () => {
  if (snapshot.status === "ready") {
    return;
  }

  if (!warmupPromise) {
    setSnapshot({ status: "warming", error: null });
    warmupPromise = warmupSearchIndex(SEARCH_INDEX_URL)
      .then(() => {
        setSnapshot({ status: "ready", error: null });
      })
      .catch((error) => {
        setSnapshot({
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  }

  await warmupPromise;
};

export const getSearchPrewarmSnapshot = () => snapshot;

export const subscribeSearchPrewarm = (listener: SearchPrewarmListener) => {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
};

export const scheduleSearchPrewarm = (delayMs = 0) => {
  if (snapshot.status === "ready" || scheduled || warmupPromise) {
    return;
  }

  scheduled = true;

  const queueWarmup = () => {
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(() => {
        idleHandle = null;
        scheduled = false;
        void startWarmup();
      });
      return;
    }

    timeoutHandle = window.setTimeout(() => {
      timeoutHandle = null;
      scheduled = false;
      void startWarmup();
    }, 1);
  };

  if (delayMs > 0) {
    timeoutHandle = window.setTimeout(() => {
      timeoutHandle = null;
      queueWarmup();
    }, delayMs);
    return;
  }

  queueWarmup();
};

export const accelerateSearchPrewarm = async () => {
  cancelScheduledWarmup();
  await startWarmup();
};
