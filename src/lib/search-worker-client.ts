type SearchWorkerRequest =
  | { id: number; type: "initSearch"; payload: { indexUrl: string } }
  | { id: number; type: "search"; payload: { request: unknown } }
  | { id: number; type: "suggest"; payload: { request: unknown } };

type SearchWorkerRequestPayload =
  | { type: "initSearch"; payload: { indexUrl: string } }
  | { type: "search"; payload: { request: unknown } }
  | { type: "suggest"; payload: { request: unknown } };

type SearchWorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
let requestId = 0;
let searchInitPromise: Promise<void> | null = null;
let searchWorkerConsumers = 0;
const pending = new Map<number, PendingRequest>();

const initWorker = () => {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL("./search-worker.ts", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
    const message = event.data;
    const handler = pending.get(message.id);
    if (!handler) {
      return;
    }

    pending.delete(message.id);

    if (message.type === "result") {
      handler.resolve(message.payload);
      return;
    }

    handler.reject(new Error(message.error.message));
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

const request = async <T = unknown>(
  payload: SearchWorkerRequestPayload,
): Promise<T> => {
  const activeWorker = initWorker();
  const id = ++requestId;
  const message = { ...payload, id } as SearchWorkerRequest;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as PendingRequest["resolve"], reject });
    activeWorker.postMessage(message);
  });
};

export const retainSearchWorker = () => {
  searchWorkerConsumers += 1;
  initWorker();
};

export const releaseSearchWorker = () => {
  searchWorkerConsumers = Math.max(0, searchWorkerConsumers - 1);
  if (searchWorkerConsumers === 0) {
    terminateSearchWorker();
  }
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

export const search = async <T>(req: T) =>
  request<unknown>({ type: "search", payload: { request: req } });

export const suggest = async <T>(req: T) =>
  request<unknown>({ type: "suggest", payload: { request: req } });

export const terminateSearchWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }

  searchInitPromise = null;
  searchWorkerConsumers = 0;
  pending.forEach((handler) => handler.reject(new Error("搜索 Worker 已终止")));
  pending.clear();
};
