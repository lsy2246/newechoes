import type { FilterRequest, FilterResult } from "./types";

type WorkerRequest =
  | { id: number; type: "initFilter"; payload: { indexUrl: string } }
  | { id: number; type: "filter"; payload: { request: FilterRequest } }
  | { id: number; type: "getTags" };

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
let filterInitPromise: Promise<void> | null = null;

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
    const error = new Error(event.message || "筛选 Worker 发生错误");
    pending.forEach((handler) => handler.reject(error));
    pending.clear();
  };

  worker.onmessageerror = () => {
    const error = new Error("筛选 Worker 消息解析失败");
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

export const initFilterIndex = async (indexUrl: string) => {
  if (!filterInitPromise) {
    filterInitPromise = request({
      type: "initFilter",
      payload: { indexUrl },
    })
      .then(() => undefined)
      .catch((error) => {
        filterInitPromise = null;
        throw error;
      });
  }

  await filterInitPromise;
};

export const filterArticles = async (requestPayload: FilterRequest) =>
  request<FilterResult>({ type: "filter", payload: { request: requestPayload } });

export const getAllTags = async () => request<string[]>({ type: "getTags" });

export const terminateFilterWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }

  filterInitPromise = null;
  pending.forEach((handler) => handler.reject(new Error("筛选 Worker 已终止")));
  pending.clear();
};
