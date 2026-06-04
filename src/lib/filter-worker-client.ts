type FilterWorkerRequest =
  | { id: number; type: "initFilter"; payload: { indexUrl: string } }
  | { id: number; type: "filter"; payload: { request: unknown } }
  | { id: number; type: "getTags" };

type FilterWorkerRequestPayload =
  | { type: "initFilter"; payload: { indexUrl: string } }
  | { type: "filter"; payload: { request: unknown } }
  | { type: "getTags" };

type FilterWorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
let requestId = 0;
let filterInitPromise: Promise<void> | null = null;
let filterWorkerConsumers = 0;
const pending = new Map<number, PendingRequest>();

const initWorker = () => {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL("./filter-worker.ts", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (event: MessageEvent<FilterWorkerResponse>) => {
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

const request = async <T = unknown>(
  payload: FilterWorkerRequestPayload,
): Promise<T> => {
  const activeWorker = initWorker();
  const id = ++requestId;
  const message = { ...payload, id } as FilterWorkerRequest;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as PendingRequest["resolve"], reject });
    activeWorker.postMessage(message);
  });
};

export const retainFilterWorker = () => {
  filterWorkerConsumers += 1;
  initWorker();
};

export const releaseFilterWorker = () => {
  filterWorkerConsumers = Math.max(0, filterWorkerConsumers - 1);
  if (filterWorkerConsumers === 0) {
    terminateFilterWorker();
  }
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

export const filterArticles = async <T>(req: T) =>
  request<unknown>({ type: "filter", payload: { request: req } });

export const getAllTags = async () => request<unknown>({ type: "getTags" });

export const terminateFilterWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }

  filterInitPromise = null;
  filterWorkerConsumers = 0;
  pending.forEach((handler) => handler.reject(new Error("筛选 Worker 已终止")));
  pending.clear();
};
