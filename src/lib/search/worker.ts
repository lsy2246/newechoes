import { createSearchRuntime } from "./runtime.js";
import type { SearchRequest } from "./types";

type WorkerRequest =
  | { id: number; type: "initSearch"; payload: { indexUrl: string } }
  | { id: number; type: "search"; payload: { request: SearchRequest } }
  | { id: number; type: "suggest"; payload: { request: SearchRequest } };

type WorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

type SearchRuntime = ReturnType<typeof createSearchRuntime>;

let searchRuntime: SearchRuntime | null = null;
const indexCache = new Map<string, Promise<unknown>>();

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

const fetchIndexJson = async (indexUrl: string) => {
  const existing = indexCache.get(indexUrl);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const response = await fetch(indexUrl, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`获取搜索索引失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  })().catch((error) => {
    indexCache.delete(indexUrl);
    throw error;
  });

  indexCache.set(indexUrl, request);
  return request;
};

const ensureSearchReady = async (indexUrl?: string) => {
  if (searchRuntime) return;
  if (!indexUrl) {
    throw new Error("搜索索引未初始化");
  }

  const indexData = await fetchIndexJson(indexUrl);
  searchRuntime = createSearchRuntime(indexData);
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type } = event.data;

  try {
    switch (type) {
      case "initSearch": {
        await ensureSearchReady(event.data.payload.indexUrl);
        respond(id, { ready: true });
        return;
      }
      case "search": {
        await ensureSearchReady();
        const start = performance.now();
        const result = searchRuntime?.search(event.data.payload.request);
        respond(id, {
          ...result,
          time_ms: Math.round(performance.now() - start),
        });
        return;
      }
      case "suggest": {
        await ensureSearchReady();
        const start = performance.now();
        const result = searchRuntime?.suggest(event.data.payload.request);
        respond(id, {
          ...result,
          time_ms: Math.round(performance.now() - start),
        });
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
