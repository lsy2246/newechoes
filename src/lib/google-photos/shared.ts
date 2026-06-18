import { fetchAssetWithRelayFallback, relayAssetUrl } from "../server/asset-relay.js";

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
  fallbackThumbUrl: string;
  displayUrl: string;
  fallbackDisplayUrl: string;
  previewUrl: string;
  fallbackPreviewUrl: string;
  originalLikeUrl: string | null;
  fallbackOriginalLikeUrl: string | null;
  videoUrl: string | null;
  fallbackVideoUrl: string | null;
};

export type GooglePhotoAlbum = {
  id: string | null;
  title: string | null;
  coverUrl: string | null;
  fallbackCoverUrl: string | null;
};

export const GOOGLE_PHOTOS_MEDIA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8",
};

export const GOOGLE_PHOTOS_PAGE_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const googlePhotosMediaUrl = (baseUrl: string, params: string) => `${baseUrl}=${params}`;
const googlePhotosImageUrl = (baseUrl: string, params: string) =>
  googlePhotosMediaUrl(baseUrl, `${params}-no`);

const localGooglePhotosMediaUrl = (mediaUrl: string) =>
  `/api/google-photos?mediaUrl=${encodeURIComponent(mediaUrl)}`;

const proxiedGooglePhotosMediaUrl = (baseUrl: string, params: string) => {
  const mediaUrl = googlePhotosImageUrl(baseUrl, params);
  const fallbackUrl = localGooglePhotosMediaUrl(mediaUrl);

  return {
    url: relayAssetUrl(mediaUrl, GOOGLE_PHOTOS_MEDIA_HEADERS) || fallbackUrl,
    fallbackUrl,
  };
};

const streamedGooglePhotosVideoUrl = (baseUrl: string) => {
  const mediaUrl = googlePhotosMediaUrl(baseUrl, "dv");
  const localUrl = localGooglePhotosMediaUrl(mediaUrl);
  const relayUrl = relayAssetUrl(mediaUrl, GOOGLE_PHOTOS_MEDIA_HEADERS);
  const mediaRelayUrl = relayUrl || null;

  return {
    url: mediaRelayUrl || localUrl,
    fallbackUrl: mediaRelayUrl ? localUrl : null,
  };
};

const proxiedGooglePhotosCoverUrl = (coverUrl: unknown) => {
  if (typeof coverUrl !== "string" || !coverUrl.startsWith("https://lh3.googleusercontent.com/")) {
    return {
      url: null,
      fallbackUrl: null,
    };
  }

  const fallbackUrl = localGooglePhotosMediaUrl(coverUrl);

  return {
    url: relayAssetUrl(coverUrl, GOOGLE_PHOTOS_MEDIA_HEADERS) || fallbackUrl,
    fallbackUrl,
  };
};

export const toPhotoItems = (items: unknown[][], startIndex = 0): GooglePhotoItem[] => {
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

      const thumbUrl = proxiedGooglePhotosMediaUrl(baseUrl, "w600");
      const displayUrl = proxiedGooglePhotosMediaUrl(baseUrl, "w1600");
      const previewUrl = proxiedGooglePhotosMediaUrl(baseUrl, "w2400");
      const originalLikeUrl =
        mediaType === "photo" && width && height
          ? proxiedGooglePhotosMediaUrl(baseUrl, `w${width}-h${height}`)
          : null;
      const videoUrl = mediaType === "video" ? streamedGooglePhotosVideoUrl(baseUrl) : null;

      return {
        index: startIndex + itemIndex + 1,
        id: item[0],
        mediaType,
        baseUrl,
        width,
        height,
        takenAt: takenMs ? new Date(takenMs).toISOString() : null,
        durationMs,
        thumbUrl: thumbUrl.url,
        fallbackThumbUrl: thumbUrl.fallbackUrl,
        displayUrl: displayUrl.url,
        fallbackDisplayUrl: displayUrl.fallbackUrl,
        previewUrl: previewUrl.url,
        fallbackPreviewUrl: previewUrl.fallbackUrl,
        originalLikeUrl: originalLikeUrl?.url || null,
        fallbackOriginalLikeUrl: originalLikeUrl?.fallbackUrl || null,
        videoUrl: videoUrl?.url || null,
        fallbackVideoUrl: videoUrl?.fallbackUrl || null,
      };
    })
    .filter((item): item is GooglePhotoItem => Boolean(item));
};

export const toAlbum = (album: unknown[]): GooglePhotoAlbum => {
  const coverUrl = proxiedGooglePhotosCoverUrl(album?.[3]);

  return {
    id: typeof album?.[0] === "string" ? album[0] : null,
    title: typeof album?.[1] === "string" ? album[1] : null,
    coverUrl: coverUrl.url,
    fallbackCoverUrl: coverUrl.fallbackUrl,
  };
};

const REQUEST_TIMEOUT_MS = 10000;

export async function fetchSharedAlbumHtml(shareUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetchAssetWithRelayFallback(shareUrl, {
      headers: GOOGLE_PHOTOS_PAGE_HEADERS,
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

  if (!response.ok) {
    throw new Error(`Google Photos request failed: ${response.status} ${response.statusText}`);
  }

  return {
    html: await response.text(),
    resolvedUrl: response.url,
  };
}
