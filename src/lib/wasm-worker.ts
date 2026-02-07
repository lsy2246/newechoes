type SearchRequest = {
  query: string;
  search_type: string;
  page_size: number;
  page: number;
};

type FilterRequest = {
  tags?: string[];
  sort?: string;
  page?: number;
  limit?: number;
  date?: string;
};

type WorkerRequest =
  | { id: number; type: "initSearch"; payload: { indexUrl: string } }
  | { id: number; type: "initFilter"; payload: { indexUrl: string } }
  | { id: number; type: "search"; payload: { request: SearchRequest } }
  | { id: number; type: "suggest"; payload: { request: SearchRequest } }
  | { id: number; type: "filter"; payload: { request: FilterRequest } }
  | { id: number; type: "getTags" };

type WorkerResponse =
  | { id: number; type: "result"; payload: unknown }
  | { id: number; type: "error"; error: { message: string } };

interface SearchWasmModule {
  init_search_index?: (indexData: Uint8Array) => void;
  search_cached?: (requestJson: string) => string;
  search_articles?: (indexData: Uint8Array, requestJson: string) => string;
  default?: () => Promise<void>;
}

interface ArticleFilterWasmModule {
  ArticleFilterJS: {
    init: (indexData: Uint8Array) => void;
    get_all_tags: () => string[];
    filter_articles: (paramsJson: string) => unknown;
  };
  default?: () => Promise<void>;
}

let searchModulePromise: Promise<SearchWasmModule> | null = null;
let filterModulePromise: Promise<ArticleFilterWasmModule> | null = null;
let filterReady = false;
let searchReady = false;

const loadSearchModule = async (): Promise<SearchWasmModule> => {
  if (!searchModulePromise) {
    searchModulePromise = (async () => {
      const wasm = (await import(
        "../assets/wasm/search/search_wasm.js"
      )) as SearchWasmModule;
      if (typeof wasm.default === "function") {
        await wasm.default();
      }
      return wasm;
    })();
  }
  return searchModulePromise;
};

const loadFilterModule = async (): Promise<ArticleFilterWasmModule> => {
  if (!filterModulePromise) {
    filterModulePromise = (async () => {
      const wasm = (await import(
        "../assets/wasm/article-filter/article_filter.js"
      )) as ArticleFilterWasmModule;
      if (typeof wasm.default === "function") {
        await wasm.default();
      }
      return wasm;
    })();
  }
  return filterModulePromise;
};

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

const ensureSearchReady = async (indexUrl?: string) => {
  if (searchReady) return;
  if (!indexUrl) {
    throw new Error("搜索索引未初始化");
  }

  const wasm = await loadSearchModule();
  const response = await fetch(indexUrl, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`获取搜索索引失败: ${response.statusText}`);
  }
  const indexData = new Uint8Array(await response.arrayBuffer());

  if (typeof wasm.init_search_index !== "function") {
    throw new Error("search_wasm 缺少 init_search_index 导出");
  }
  wasm.init_search_index(indexData);
  searchReady = true;
};

const ensureFilterReady = async (indexUrl?: string) => {
  if (filterReady) return;
  if (!indexUrl) {
    throw new Error("筛选索引未初始化");
  }

  const wasm = await loadFilterModule();
  const response = await fetch(indexUrl, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`获取筛选索引失败: ${response.statusText}`);
  }
  const indexData = new Uint8Array(await response.arrayBuffer());
  wasm.ArticleFilterJS.init(indexData);
  filterReady = true;
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case "initSearch": {
        await ensureSearchReady(payload.indexUrl);
        respond(id, { ready: true });
        return;
      }
      case "initFilter": {
        await ensureFilterReady(payload.indexUrl);
        respond(id, { ready: true });
        return;
      }
      case "search": {
        await ensureSearchReady();
        const wasm = await loadSearchModule();
        if (typeof wasm.search_cached !== "function") {
          throw new Error("search_wasm 缺少 search_cached 导出");
        }
        const resultJson = wasm.search_cached(JSON.stringify(payload.request));
        respond(id, JSON.parse(resultJson));
        return;
      }
      case "suggest": {
        await ensureSearchReady();
        const wasm = await loadSearchModule();
        if (typeof wasm.search_cached !== "function") {
          throw new Error("search_wasm 缺少 search_cached 导出");
        }
        const resultJson = wasm.search_cached(JSON.stringify(payload.request));
        respond(id, JSON.parse(resultJson));
        return;
      }
      case "filter": {
        await ensureFilterReady();
        const wasm = await loadFilterModule();
        const result = wasm.ArticleFilterJS.filter_articles(
          JSON.stringify(payload.request),
        );
        respond(id, result);
        return;
      }
      case "getTags": {
        await ensureFilterReady();
        const wasm = await loadFilterModule();
        const tags = wasm.ArticleFilterJS.get_all_tags() || [];
        respond(id, tags);
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
