import { ASSET_RELAY_URL } from "../../consts.js";

const ASSET_RELAY_URL_PLACEHOLDER = "{url}";
const ASSET_RELAY_HEADERS_PLACEHOLDER = "{headers}";

export type AssetRelayHeaders = Record<string, string>;
export type AssetRelayCacheMode = "auto" | "off" | "prefer" | "refresh" | "bypass";
export type AssetRelayCacheKeyMode = "auto" | "full" | "ignore_search" | "custom";

export type AssetRelayOptions = {
  cache?: AssetRelayCacheMode;
  cacheTtl?: number;
  cacheKeyMode?: AssetRelayCacheKeyMode;
  cacheKey?: string;
  mode?: "proxy" | "media" | "inspect";
};

export function relayAssetUrl(
  url: string | null | undefined,
  headers?: AssetRelayHeaders,
  options: AssetRelayOptions = {},
) {
  if (!url || !ASSET_RELAY_URL) {
    return null;
  }

  if (!ASSET_RELAY_URL.includes(ASSET_RELAY_URL_PLACEHOLDER)) {
    return null;
  }

  const encodedHeaders = headers ? encodeURIComponent(JSON.stringify(headers)) : "";

  const relayUrl = ASSET_RELAY_URL
    .replaceAll(ASSET_RELAY_URL_PLACEHOLDER, encodeURIComponent(url))
    .replaceAll(ASSET_RELAY_HEADERS_PLACEHOLDER, encodedHeaders);

  const {
    cache,
    cacheTtl,
    cacheKeyMode,
    cacheKey,
    mode,
  } = options;

  if (!cache && !cacheTtl && !cacheKeyMode && !cacheKey && !mode) {
    return relayUrl;
  }

  const relayUrlObject = new URL(relayUrl);

  if (cache) {
    relayUrlObject.searchParams.set("cache", cache);
  }

  if (typeof cacheTtl === "number" && Number.isFinite(cacheTtl) && cacheTtl > 0) {
    relayUrlObject.searchParams.set("cache_ttl", String(cacheTtl));
  }

  if (cacheKeyMode) {
    relayUrlObject.searchParams.set("cache_key_mode", cacheKeyMode);
  }

  if (cacheKey) {
    relayUrlObject.searchParams.set("cache_key", cacheKey);
  }

  if (mode) {
    relayUrlObject.searchParams.set("mode", mode);
  }

  return relayUrlObject.toString();
}

export async function fetchAssetWithRelayFallback(
  url: string,
  options: { headers?: AssetRelayHeaders; signal?: AbortSignal } & AssetRelayOptions = {},
): Promise<Response> {
  const headers = options.headers;
  const signal = options.signal;
  const relayUrl = relayAssetUrl(url, headers, options);

  if (relayUrl) {
    try {
      const response = await fetch(relayUrl, { signal });

      if (response.ok) {
        return response;
      }
    } catch {
      // 外部代理不可用时回退到站点后端直连。
    }
  }

  return fetch(url, { headers, signal });
}

export function fetchAssetDirect(
  url: string,
  options: { headers?: AssetRelayHeaders; signal?: AbortSignal } = {},
): Promise<Response> {
  return fetch(url, {
    headers: options.headers,
    signal: options.signal,
  });
}
