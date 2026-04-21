import type { APIRoute } from "astro";
import { fetchGooglePhotosPage } from "@/lib/google-photos";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const shareUrl = url.searchParams.get("shareUrl");
  const cursor = url.searchParams.get("cursor");
  const loadedCount = Number.parseInt(url.searchParams.get("loadedCount") || "0", 10);

  if (!shareUrl) {
    return new Response(JSON.stringify({ error: "缺少 Google Photos 分享链接" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  try {
    const data = await fetchGooglePhotosPage({
      shareUrl,
      cursor,
      loadedCount: Number.isNaN(loadedCount) ? 0 : loadedCount,
    });

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cursor ? "public, s-maxage=3600" : "public, s-maxage=300",
        "CDN-Cache-Control": cursor ? "public, max-age=3600" : "public, max-age=300",
      },
    });
  } catch (error) {
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
