import vm from "node:vm";

const RPC_ID = "snAcKc";

export type GooglePhotoItem = {
  index: number;
  id: string;
  mediaType: "photo" | "video";
  baseUrl: string;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  durationMs: number | null;
  thumbUrl: string;
  displayUrl: string;
  previewUrl: string;
  originalLikeUrl: string | null;
  videoUrl: string | null;
};

export type GooglePhotoAlbum = {
  id: string | null;
  title: string | null;
  coverUrl: string | null;
};

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

const REQUEST_TIMEOUT_MS = 10000;

const imageUrl = (baseUrl: string, params: string) => `${baseUrl}=${params}`;

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

const encodeCursor = (cursor: CursorPayload) =>
  Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");

const decodeCursor = (cursor: string): CursorPayload =>
  JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

const toPhotoItems = (items: unknown[][], startIndex = 0): GooglePhotoItem[] => {
  return items
    .map((item, itemIndex) => {
      const media = item[1] as unknown[] | undefined;
      const metadata = item[9] as Record<string, unknown> | undefined;
      const videoMetadata = metadata?.["76647426"] as unknown[] | undefined;
      const baseUrl = media?.[0];
      const width = typeof media?.[1] === "number" ? media[1] : null;
      const height = typeof media?.[2] === "number" ? media[2] : null;
      const takenMs = typeof item[2] === "number" ? item[2] : null;
      const durationMs = typeof videoMetadata?.[0] === "number" ? videoMetadata[0] : null;
      const mediaType: GooglePhotoItem["mediaType"] = durationMs ? "video" : "photo";

      if (typeof item[0] !== "string" || typeof baseUrl !== "string") {
        return null;
      }

      if (!baseUrl.startsWith("https://lh3.googleusercontent.com/")) {
        return null;
      }

      return {
        index: startIndex + itemIndex + 1,
        id: item[0],
        mediaType,
        baseUrl,
        width,
        height,
        takenAt: takenMs ? new Date(takenMs).toISOString() : null,
        durationMs,
        thumbUrl: imageUrl(baseUrl, "w600"),
        displayUrl: imageUrl(baseUrl, "w1600"),
        previewUrl: imageUrl(baseUrl, "w2400"),
        originalLikeUrl:
          mediaType === "photo" && width && height ? imageUrl(baseUrl, `w${width}-h${height}`) : null,
        videoUrl: mediaType === "video" ? imageUrl(baseUrl, "dv") : null,
      };
    })
    .filter((item): item is GooglePhotoItem => Boolean(item));
};

const toAlbum = (album: unknown[]): GooglePhotoAlbum => ({
  id: typeof album?.[0] === "string" ? album[0] : null,
  title: typeof album?.[1] === "string" ? album[1] : null,
  coverUrl: typeof album?.[3] === "string" ? album[3] : null,
});

export async function fetchSharedAlbumHtml(shareUrl: string) {
  const response = await fetchWithTimeout(shareUrl, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Photos request failed: ${response.status} ${response.statusText}`);
  }

  return {
    html: await response.text(),
    resolvedUrl: response.url,
  };
}

export function parseInitData(html: string): InitData {
  const callbacks: Record<string, { data: unknown[] }> = {};
  const context = {
    AF_initDataCallback(data: { key: string; data: unknown[] }) {
      callbacks[data.key] = data;
    },
  };
  vm.createContext(context);

  const callbackScriptPattern =
    /<script class="(ds:\d+)"[^>]*>(AF_initDataCallback\([\s\S]*?\);)<\/script>/g;

  let match;
  while ((match = callbackScriptPattern.exec(html))) {
    vm.runInContext(match[2], context, {
      timeout: 1000,
      displayErrors: false,
    });
  }

  const albumData = Object.values(callbacks).find(({ data }) => {
    return Array.isArray(data?.[1]) && Array.isArray(data?.[3]);
  });

  if (!albumData) {
    throw new Error("Could not find Google Photos album data in page payload");
  }

  return albumData.data as InitData;
}

export function parseGlobalData(html: string): GlobalData {
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
    if (entry?.[2]) {
      return JSON.parse(entry[2]);
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
}) {
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
  const initData = parseInitData(html);
  const globalData = parseGlobalData(html);
  const albumId = initData[3]?.[0];

  if (typeof albumId !== "string") {
    throw new Error("Could not find Google Photos album id");
  }

  const shareKey = new URL(resolvedUrl).searchParams.get("key");
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
