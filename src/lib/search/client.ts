import type { SearchRequest, SearchResult } from "./types";

type WorkerRequest =
  | { id: number; type: "initSearch"; payload: { indexUrl: string } }
  | { id: number; type: "search"; payload: { request: SearchRequest } }
  | { id: number; type: "suggest"; payload: { request: SearchRequest } };

type WorkerRequestPayload = Omit<WorkerRequest, "id">;

type WorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, PendingRequest>();
let searchInitPromise: Promise<void> | null = null;

const initWorker = () => {
  if (worker) return worker;

  worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    const handler = pending.get(message.id);
    if (!handler) return;

    pending.delete(message.id);
    if (message.type === "result") {
      handler.resolve(message.payload);
    } else {
      handler.reject(new Error(message.error.message));
    }
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || "搜索 Worker 发生错误");
    pending.forEach((handler) => handler.reject(error));
    pending.clear();
  };

  worker.onmessageerror = () => {
    const error = new Error("搜索 Worker 消息解析失败");
    pending.forEach((handler) => handler.reject(error));
    pending.clear();
  };

  return worker;
};

const request = async <T = unknown>(payload: WorkerRequestPayload): Promise<T> => {
  const activeWorker = initWorker();
  const id = ++requestId;
  const message = { ...payload, id } as WorkerRequest;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as PendingRequest["resolve"], reject });
    activeWorker.postMessage(message);
  });
};

export const warmupSearchIndex = async (indexUrl: string) => {
  if (!searchInitPromise) {
    searchInitPromise = request({
      type: "initSearch",
      payload: { indexUrl },
    })
      .then(() => undefined)
      .catch((error) => {
        searchInitPromise = null;
        throw error;
      });
  }

  await searchInitPromise;
};

export const searchArticles = async (requestPayload: SearchRequest) =>
  request<SearchResult>({ type: "search", payload: { request: requestPayload } });

export const suggestArticles = async (requestPayload: SearchRequest) =>
  request<SearchResult>({ type: "suggest", payload: { request: requestPayload } });

export const terminateSearchWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }

  searchInitPromise = null;
  pending.forEach((handler) => handler.reject(new Error("搜索 Worker 已终止")));
  pending.clear();
};
