type WorkerRequest =
  | { id: number; type: "initSearch"; payload: { indexUrl: string } }
  | { id: number; type: "initFilter"; payload: { indexUrl: string } }
  | { id: number; type: "search"; payload: { request: unknown } }
  | { id: number; type: "suggest"; payload: { request: unknown } }
  | { id: number; type: "filter"; payload: { request: unknown } }
  | { id: number; type: "getTags" };

type WorkerRequestPayload =
  | { type: "initSearch"; payload: { indexUrl: string } }
  | { type: "initFilter"; payload: { indexUrl: string } }
  | { type: "search"; payload: { request: unknown } }
  | { type: "suggest"; payload: { request: unknown } }
  | { type: "filter"; payload: { request: unknown } }
  | { type: "getTags" };

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
let filterInitPromise: Promise<void> | null = null;

const initWorker = () => {
  if (worker) return worker;

  worker = new Worker(new URL("./wasm-worker.ts", import.meta.url), {
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
    const error = new Error(event.message || "Worker 发生错误");
    pending.forEach((handler) => handler.reject(error));
    pending.clear();
  };

  worker.onmessageerror = () => {
    const error = new Error("Worker 消息解析失败");
    pending.forEach((handler) => handler.reject(error));
    pending.clear();
  };

  return worker;
};

const request = async <T = unknown>(
  payload: WorkerRequestPayload,
): Promise<T> => {
  const activeWorker = initWorker();
  const id = ++requestId;
  const message = { ...payload, id } as WorkerRequest;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as PendingRequest["resolve"], reject });
    activeWorker.postMessage(message);
  });
};

export const initSearchIndex = async (indexUrl: string) => {
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

export const search = async <T>(req: T) =>
  request<unknown>({ type: "search", payload: { request: req } });

export const suggest = async <T>(req: T) =>
  request<unknown>({ type: "suggest", payload: { request: req } });

export const filterArticles = async <T>(req: T) =>
  request<unknown>({ type: "filter", payload: { request: req } });

export const getAllTags = async () => request<unknown>({ type: "getTags" });

export const terminateWasmWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  searchInitPromise = null;
  filterInitPromise = null;
  pending.forEach((handler) =>
    handler.reject(new Error("Worker 已终止")),
  );
  pending.clear();
};
