import { createFilterRuntime } from "./runtime.js";
import type { FilterRequest } from "./types";

type WorkerRequest =
  | { id: number; type: "initFilter"; payload: { indexUrl: string } }
  | { id: number; type: "filter"; payload: { request: FilterRequest } }
  | { id: number; type: "getTags" };

type WorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

type FilterRuntime = ReturnType<typeof createFilterRuntime>;

let filterRuntime: FilterRuntime | null = null;
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
      throw new Error(`获取筛选索引失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  })().catch((error) => {
    indexCache.delete(indexUrl);
    throw error;
  });

  indexCache.set(indexUrl, request);
  return request;
};

const ensureFilterReady = async (indexUrl?: string) => {
  if (filterRuntime) return;
  if (!indexUrl) {
    throw new Error("筛选索引未初始化");
  }

  const indexData = await fetchIndexJson(indexUrl);
  filterRuntime = createFilterRuntime(indexData);
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
        await ensureFilterReady();
        respond(id, filterRuntime?.filter(event.data.payload.request));
        return;
      }
      case "getTags": {
        await ensureFilterReady();
        respond(id, filterRuntime?.getAllTags() || []);
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
