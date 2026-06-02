import { supportsGooglePhotosParsing } from "../../platform/runtime/index.js";
import type { GooglePhotoAlbum, GooglePhotoItem } from "./shared";
import { fetchSharedAlbumHtml, toAlbum, toPhotoItems } from "./shared";

const RPC_ID = "snAcKc";
const REQUEST_TIMEOUT_MS = 10000;

type CursorPayload = {
  albumId: string;
  shareKey: string | null;
  token: string;
  fSid: string;
  bl: string;
  requestId: number;
};

type InitData = [
  unknown,
  unknown[][],
  string,
  unknown[],
  unknown[],
  number,
];

type GlobalData = {
  FdrFJe: string;
  cfb2h: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeBase64Url(value: string) {
  return bytesToBase64(textEncoder.encode(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4 || 4)) % 4), "=");
  return textDecoder.decode(base64ToBytes(padded));
}

async function fetchWithTimeout(url: URL | string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Google Photos 请求超时");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const encodeCursor = (cursor: CursorPayload) => encodeBase64Url(JSON.stringify(cursor));

const decodeCursor = (cursor: string): CursorPayload => JSON.parse(decodeBase64Url(cursor));

const getShareKey = (initData: InitData, resolvedUrl: string) => {
  const albumShareKey = initData[3]?.[19];

  if (typeof albumShareKey === "string" && albumShareKey) {
    return albumShareKey;
  }

  return new URL(resolvedUrl).searchParams.get("key");
};

async function parseInitDataAsync(html: string): Promise<InitData> {
  const callbackScriptPattern =
    /<script class="(ds:\d+)"[^>]*>(AF_initDataCallback\(\{[\s\S]*?\}\);)<\/script>/g;

  let match;
  while ((match = callbackScriptPattern.exec(html))) {
    const callbackScript = match[2];
    const data = extractCallbackData(callbackScript);

    if (Array.isArray(data?.[1]) && Array.isArray(data?.[3])) {
      return data as InitData;
    }
  }

  throw new Error("Could not find Google Photos album data in page payload");
}

function extractCallbackData(callbackScript: string) {
  const dataIndex = callbackScript.indexOf("data:");
  const sideChannelIndex = callbackScript.lastIndexOf(", sideChannel:");
  const callbackEndIndex = callbackScript.lastIndexOf("});");

  const dataEndIndex =
    sideChannelIndex > dataIndex ? sideChannelIndex : callbackEndIndex > dataIndex ? callbackEndIndex : -1;

  if (dataIndex === -1 || dataEndIndex === -1 || dataEndIndex <= dataIndex) {
    throw new Error("Could not isolate Google Photos callback data");
  }

  const rawData = callbackScript.slice(dataIndex + 5, dataEndIndex).trim().replace(/,\s*$/, "");
  return JSON.parse(rawData);
}

function parseGlobalData(html: string): GlobalData {
  const match = html.match(/window\.WIZ_global_data = (\{.*?\});<\/script>/s);

  if (!match) {
    throw new Error("Could not find Google Photos global data in page payload");
  }

  return JSON.parse(match[1]) as GlobalData;
}

export function parseBatchExecuteResponse(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!line.startsWith("[")) {
      continue;
    }

    let payload;
    try {
      payload = JSON.parse(line);
    } catch {
      continue;
    }

    const entry = payload.find((item: unknown[]) => item?.[0] === "wrb.fr" && item?.[1] === RPC_ID);
    if (typeof entry?.[2] === "string") {
      return JSON.parse(entry[2]);
    }

    if (entry?.[5]?.[0] === 5) {
      throw new Error("Google Photos pagination token was rejected");
    }
  }

  throw new Error("Could not parse Google Photos page response");
}

async function fetchAlbumPage(cursor: CursorPayload) {
  const endpoint = new URL("https://photos.google.com/_/PhotosUi/data/batchexecute");
  endpoint.search = new URLSearchParams({
    rpcids: RPC_ID,
    "source-path": `/share/${cursor.albumId}`,
    "f.sid": cursor.fSid,
    bl: cursor.bl,
    hl: "en-US",
    "soc-app": "165",
    "soc-platform": "1",
    "soc-device": "1",
    _reqid: String(cursor.requestId),
    rt: "c",
  }).toString();

  const body = new URLSearchParams({
    "f.req": JSON.stringify([
      [[RPC_ID, JSON.stringify([cursor.albumId, cursor.token, null, cursor.shareKey]), null, "generic"]],
    ]),
  });

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "x-same-domain": "1",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Google Photos page request failed: ${response.status} ${response.statusText}`);
  }

  return parseBatchExecuteResponse(await response.text()) as InitData;
}

export async function fetchGooglePhotosPage({
  shareUrl,
  cursor,
  loadedCount = 0,
}: {
  shareUrl: string;
  cursor?: string | null;
  loadedCount?: number;
}): Promise<{
  album: GooglePhotoAlbum;
  photos: GooglePhotoItem[];
  nextCursor: string | null;
}> {
  if (!supportsGooglePhotosParsing()) {
    throw new Error("当前部署平台未启用 Google Photos 服务端解析");
  }

  if (cursor) {
    const cursorPayload = decodeCursor(cursor);
    const pageData = await fetchAlbumPage(cursorPayload);
    const nextToken = pageData[2] || "";

    return {
      album: toAlbum(pageData[3]),
      photos: toPhotoItems(pageData[1], loadedCount),
      nextCursor: nextToken
        ? encodeCursor({
            ...cursorPayload,
            token: nextToken,
            requestId: cursorPayload.requestId + 100000,
          })
        : null,
    };
  }

  const { html, resolvedUrl } = await fetchSharedAlbumHtml(shareUrl);
  const initData = await parseInitDataAsync(html);
  const globalData = parseGlobalData(html);
  const albumId = initData[3]?.[0];

  if (typeof albumId !== "string") {
    throw new Error("Could not find Google Photos album id");
  }

  const shareKey = getShareKey(initData, resolvedUrl);
  const nextToken = initData[2] || "";

  return {
    album: toAlbum(initData[3]),
    photos: toPhotoItems(initData[1], 0),
    nextCursor: nextToken
      ? encodeCursor({
          albumId,
          shareKey,
          token: nextToken,
          fSid: globalData.FdrFJe,
          bl: globalData.cfb2h,
          requestId: 100000,
        })
      : null,
  };
}
