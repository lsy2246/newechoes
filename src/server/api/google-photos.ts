import { GOOGLE_PHOTOS_MEDIA_HEADERS } from "../../lib/google-photos/shared";
import { createServerRequestLog, summarizeUrl } from "../../lib/server-request-log";
import { fetchAssetDirect } from "../../lib/server-asset-relay";
import { supportsGooglePhotosParsing } from "../../platform/runtime/index.js";

const GOOGLE_PHOTOS_MEDIA_HOST = "lh3.googleusercontent.com";

function isAllowedGooglePhotosMediaUrl(mediaUrl: string) {
  try {
    const parsedUrl = new URL(mediaUrl);
    return parsedUrl.protocol === "https:" && parsedUrl.hostname === GOOGLE_PHOTOS_MEDIA_HOST;
  } catch {
    return false;
  }
}

export const GET = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const mediaUrl = url.searchParams.get("mediaUrl");
  const shareUrl = url.searchParams.get("shareUrl");
  const cursor = url.searchParams.get("cursor");
  const loadedCount = Number.parseInt(url.searchParams.get("loadedCount") || "0", 10);
  const log = createServerRequestLog("api.google-photos", request, {
    hasMediaUrl: Boolean(mediaUrl),
    mediaUrl: summarizeUrl(mediaUrl),
    shareUrl: summarizeUrl(shareUrl),
    hasCursor: Boolean(cursor),
    loadedCount,
  });

  if (mediaUrl) {
    if (!isAllowedGooglePhotosMediaUrl(mediaUrl)) {
      log.respond(400, { reason: "invalid_media_url" });
      return new Response("Invalid Google Photos media URL", {
        status: 400,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    try {
      log.info("media.proxy.fetch.start", {
        mediaUrl: summarizeUrl(mediaUrl),
      });
      const response = await fetchAssetDirect(mediaUrl, {
        headers: GOOGLE_PHOTOS_MEDIA_HEADERS,
      });

      if (!response.ok) {
        log.warn("media.proxy.fetch.non_ok", {
          mediaUrl: summarizeUrl(mediaUrl),
          upstreamStatus: response.status,
        });
        return new Response("Failed to fetch Google Photos media", { status: response.status });
      }

      const mediaBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      log.respond(200, {
        reason: "media_proxy_success",
        mediaUrl: summarizeUrl(mediaUrl),
      });

      return new Response(mediaBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "CDN-Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      log.error("media.proxy.fetch.error", error, {
        mediaUrl: summarizeUrl(mediaUrl),
      });
      log.respond(500, { reason: "media_proxy_failed" });
      return new Response("Error fetching Google Photos media", { status: 500 });
    }
  }

  if (!shareUrl) {
    log.respond(400, { reason: "missing_share_url" });
    return new Response(JSON.stringify({ error: "缺少 Google Photos 分享链接" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  if (!supportsGooglePhotosParsing()) {
    log.respond(501, { reason: "platform_parsing_disabled" });
    return new Response(
      JSON.stringify({
        error: "当前平台暂未启用相册解析",
        message: "Cloudflare 版本已保留相册页面骨架，但服务端解析需改为兼容实现后才能启用。",
      }),
      {
        status: 501,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  try {
    log.info("share.fetch.start", {
      shareUrl: summarizeUrl(shareUrl),
      hasCursor: Boolean(cursor),
    });
    const { fetchGooglePhotosPage } = await import("../../lib/google-photos/node");
    const data = await fetchGooglePhotosPage({
      shareUrl,
      cursor,
      loadedCount: Number.isNaN(loadedCount) ? 0 : loadedCount,
    });

    const itemsCount = Array.isArray((data as { items?: unknown[] }).items)
      ? ((data as { items: unknown[] }).items.length)
      : undefined;
    log.respond(200, {
      reason: "share_fetch_success",
      items: itemsCount,
      hasNextCursor: Boolean((data as { nextCursor?: string | null }).nextCursor),
    });

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cursor ? "public, s-maxage=3600" : "public, s-maxage=300",
        "CDN-Cache-Control": cursor ? "public, max-age=3600" : "public, max-age=300",
      },
    });
  } catch (error) {
    log.error("share.fetch.error", error, {
      shareUrl: summarizeUrl(shareUrl),
      hasCursor: Boolean(cursor),
    });
    log.respond(500, { reason: "share_fetch_failed" });
    return new Response(
      JSON.stringify({
        error: "获取相册数据失败",
        message: error instanceof Error ? error.message : "未知错误",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
};
