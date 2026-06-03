import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Masonry from "react-masonry-css";

interface PhotoAlbumMasonryProps {
  shareId: string;
  title?: string;
  showTitle?: boolean;
  className?: string;
}

interface PhotoItem {
  index: number;
  id: string;
  mediaType: "photo" | "video";
  width: number | null;
  height: number | null;
  takenAt: string | null;
  durationMs: number | null;
  thumbUrl: string;
  fallbackThumbUrl?: string | null;
  displayUrl: string;
  fallbackDisplayUrl?: string | null;
  previewUrl: string;
  fallbackPreviewUrl?: string | null;
  originalLikeUrl: string | null;
  fallbackOriginalLikeUrl?: string | null;
  videoUrl: string | null;
  fallbackVideoUrl?: string | null;
}

interface AlbumInfo {
  title: string | null;
}

interface AlbumResponse {
  album: AlbumInfo;
  photos: PhotoItem[];
  nextCursor: string | null;
}

interface ScrollLockState {
  scrollX: number;
  scrollY: number;
}

const REVEAL_BATCH_SIZE = 15;
const CLIENT_TIMEOUT_MS = 12000;
const GOOGLE_PHOTOS_SHARE_URL_BASE = "https://photos.app.goo.gl/";
const EMPTY_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const breakpointColumns = {
  default: 5,
  1280: 4,
  1024: 3,
  640: 2,
};

const formatDuration = (durationMs: number | null) => {
  if (!durationMs) {
    return null;
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const getPreviewVideoLoadProgress = (
  video: HTMLVideoElement,
  fallbackDurationMs: number | null,
) => {
  const durationSeconds =
    Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : fallbackDurationMs
        ? fallbackDurationMs / 1000
        : null;

  if (!durationSeconds || !video.buffered.length) {
    return null;
  }

  try {
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    return Math.max(0, Math.min(100, Math.round((bufferedEnd / durationSeconds) * 100)));
  } catch {
    return null;
  }
};

const getTakenAtValue = (takenAt: string | null) => {
  if (!takenAt) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(takenAt);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const sortPhotosForDisplay = (items: PhotoItem[]) =>
  [...items].sort((left, right) => {
    const leftTakenAt = getTakenAtValue(left.takenAt);
    const rightTakenAt = getTakenAtValue(right.takenAt);

    if (leftTakenAt !== rightTakenAt) {
      return rightTakenAt - leftTakenAt;
    }

    if (left.index !== right.index) {
      return left.index - right.index;
    }

    return left.id.localeCompare(right.id);
  });

const PhotoAlbumMasonry: React.FC<PhotoAlbumMasonryProps> = ({
  shareId,
  title,
  showTitle = true,
  className = "",
}) => {
  const [album, setAlbum] = useState<AlbumInfo | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(REVEAL_BATCH_SIZE);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreContent, setHasMoreContent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageFailureCount, setImageFailureCount] = useState(0);
  const [loadedMediaIds, setLoadedMediaIds] = useState<Record<string, true>>({});
  const [previewThumbLoaded, setPreviewThumbLoaded] = useState(false);
  const [previewFullLoaded, setPreviewFullLoaded] = useState(false);
  const [previewVideoRequested, setPreviewVideoRequested] = useState(false);
  const [previewVideoReady, setPreviewVideoReady] = useState(false);
  const [previewVideoPlayRequested, setPreviewVideoPlayRequested] = useState(false);
  const [previewVideoStarted, setPreviewVideoStarted] = useState(false);
  const [previewVideoBuffering, setPreviewVideoBuffering] = useState(false);
  const [previewVideoLoadProgress, setPreviewVideoLoadProgress] = useState<number | null>(null);
  const [previewVideoFailed, setPreviewVideoFailed] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollDetectorRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const imageFailureIdsRef = useRef(new Set<string>());
  const scrollLockStateRef = useRef<ScrollLockState | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewPosterImageRef = useRef<HTMLImageElement | null>(null);
  const previewImageElementRef = useRef<HTMLImageElement | null>(null);
  const previewFullImageElementRef = useRef<HTMLImageElement | null>(null);

  const stateRef = useRef({
    isLoading: false,
    hasMoreContent: true,
    visibleCount: REVEAL_BATCH_SIZE,
    photosLength: 0,
    nextCursor: null as string | null,
  });

  const orderedPhotos = useMemo(() => sortPhotosForDisplay(photos), [photos]);
  const visiblePhotos = useMemo(
    () => orderedPhotos.slice(0, visibleCount),
    [orderedPhotos, visibleCount],
  );

  const selectedPhoto = selectedIndex !== null ? orderedPhotos[selectedIndex] : null;
  const selectedPhotoOrder = selectedIndex !== null ? selectedIndex + 1 : null;
  const isPreviewOpen = selectedIndex !== null;
  const networkHint =
    imageFailureCount >= 3
      ? "检测到多张图片加载失败，当前网络可能无法访问 Google Photos 资源。"
      : null;
  const hasLoadedEmptyAlbum = !isLoading && !error && photos.length === 0 && !hasMoreContent;
  const previewImageUrl = selectedPhoto?.previewUrl || selectedPhoto?.displayUrl || null;
  const previewFullImageUrl =
    selectedPhoto?.originalLikeUrl || selectedPhoto?.previewUrl || selectedPhoto?.displayUrl || null;
  const previewAspectRatio =
    selectedPhoto?.width && selectedPhoto?.height
      ? selectedPhoto.width / selectedPhoto.height
      : 1;
  const previewFrameWidth =
    selectedPhoto?.width && selectedPhoto?.height
      ? `min(100%, calc(80vh * ${previewAspectRatio}))`
      : "100%";
  const isPreviewVideoStatusVisible =
    previewVideoRequested &&
    !previewVideoFailed &&
    (!previewVideoStarted || previewVideoBuffering);
  const shouldLoadFullPreviewImage =
    Boolean(previewFullImageUrl) &&
    previewFullImageUrl !== previewImageUrl &&
    previewThumbLoaded;
  const previewVideoStatusText = !previewVideoRequested
    ? "点击开始加载视频"
    : previewVideoFailed
      ? "视频加载失败，请重试"
      : !previewVideoReady
        ? "正在加载视频..."
        : previewVideoPlayRequested && !previewVideoStarted
          ? "正在缓冲视频..."
          : !previewVideoStarted
          ? "已加载首帧，点击播放"
          : "正在缓冲视频...";
  const previewVideoProgressText =
    previewVideoLoadProgress !== null ? `已加载 ${previewVideoLoadProgress}%` : null;
  const isPreviewVideoOverlayVisible = !previewVideoStarted || previewVideoFailed;
  const isPreviewVideoSpinnerVisible =
    previewVideoRequested &&
    (!previewVideoReady || previewVideoBuffering || (previewVideoPlayRequested && !previewVideoStarted));
  const isPreviewVideoPlayButtonVisible = !previewVideoPlayRequested || previewVideoFailed;
  const isPreviewVideoControlsVisible = previewVideoStarted;

  const abortImageRequest = useCallback((image: HTMLImageElement | null) => {
    if (!image) {
      return;
    }

    image.onload = null;
    image.onerror = null;
    image.removeAttribute("src");
    image.src = EMPTY_IMAGE_SRC;
  }, []);

  const stopPreviewMediaRequests = useCallback(() => {
    const video = previewVideoRef.current;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.removeAttribute("poster");
      video.load();
    }

    abortImageRequest(previewPosterImageRef.current);
    abortImageRequest(previewImageElementRef.current);
    abortImageRequest(previewFullImageElementRef.current);
  }, [abortImageRequest]);

  const syncPreviewVideoLoadProgress = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video) {
        setPreviewVideoLoadProgress(null);
        return;
      }

      setPreviewVideoLoadProgress(
        getPreviewVideoLoadProgress(video, selectedPhoto?.durationMs || null),
      );
    },
    [selectedPhoto?.durationMs],
  );

  const playPreviewVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    setPreviewVideoPlayRequested(true);
    setPreviewVideoBuffering(true);
    const playResult = video.play();

    if (typeof playResult?.catch === "function") {
      playResult.catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPreviewVideoPlayRequested(false);
        setPreviewVideoBuffering(false);
      });
    }
  }, []);

  const syncPreviewVideoPlaybackStarted = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    try {
      const hasAdvancedPlayback =
        video.currentTime > 0 ||
        (video.played.length > 0 && video.played.end(video.played.length - 1) > 0);

      if (hasAdvancedPlayback) {
        setPreviewThumbLoaded(true);
        setPreviewVideoReady(true);
        setPreviewVideoStarted(true);
        setPreviewVideoBuffering(false);
        setPreviewVideoFailed(false);
      }
    } catch {
      if (video.currentTime > 0) {
        setPreviewThumbLoaded(true);
        setPreviewVideoReady(true);
        setPreviewVideoStarted(true);
        setPreviewVideoBuffering(false);
        setPreviewVideoFailed(false);
      }
    }
  }, []);

  const requestPreviewVideo = useCallback(() => {
    if (!selectedPhoto?.videoUrl) {
      return;
    }

    const video = previewVideoRef.current;

    if (!video) {
      return;
    }

    const shouldReloadPreviewVideo =
      !previewVideoRequested || previewVideoFailed || !video.currentSrc;

    if (!shouldReloadPreviewVideo) {
      if (previewVideoReady || video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        playPreviewVideo(video);
      }
      return;
    }

    setPreviewVideoRequested(true);
    setPreviewVideoPlayRequested(false);
    setPreviewVideoFailed(false);
    setPreviewVideoReady(false);
    setPreviewVideoStarted(false);
    setPreviewVideoBuffering(true);
    setPreviewVideoLoadProgress(null);
    delete video.dataset.fallbackApplied;
    video.src = selectedPhoto.videoUrl;
    video.poster = selectedPhoto.previewUrl || selectedPhoto.displayUrl;
    video.load();
  }, [
    playPreviewVideo,
    previewVideoFailed,
    previewVideoReady,
    previewVideoRequested,
    selectedPhoto?.displayUrl,
    selectedPhoto?.previewUrl,
    selectedPhoto?.videoUrl,
  ]);

  const fetchPhotoPage = useCallback(
    async (cursor: string | null = null, loadedCount = 0) => {
      if (stateRef.current.isLoading) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const timeout = window.setTimeout(() => {
        abortControllerRef.current?.abort();
      }, CLIENT_TIMEOUT_MS);

      setIsLoading(true);
      stateRef.current.isLoading = true;
      setError(null);

      try {
        const params = new URLSearchParams({
          shareUrl: `${GOOGLE_PHOTOS_SHARE_URL_BASE}${encodeURIComponent(shareId)}`,
          loadedCount: String(loadedCount),
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await fetch(`/api/google-photos?${params.toString()}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!isMountedRef.current) {
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || data?.error || "相册数据加载失败");
        }

        const data = (await response.json()) as AlbumResponse;

        if (!isMountedRef.current) {
          return;
        }

        setAlbum(data.album);
        setPhotos((prev) => {
          const merged = cursor ? [...prev, ...data.photos] : data.photos;
          stateRef.current.photosLength = merged.length;
          return merged;
        });
        setNextCursor(data.nextCursor);
        stateRef.current.nextCursor = data.nextCursor;
        setHasMoreContent(Boolean(data.nextCursor));
        stateRef.current.hasMoreContent = Boolean(data.nextCursor);
      } catch (fetchError) {
        if (!isMountedRef.current) {
          return;
        }

        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          setError("相册请求超时，当前网络可能无法访问 Google Photos。");
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "相册数据加载失败");
      } finally {
        window.clearTimeout(timeout);
        if (isMountedRef.current) {
          setIsLoading(false);
          stateRef.current.isLoading = false;
        }
      }
    },
    [shareId],
  );

  const loadMore = useCallback(() => {
    if (stateRef.current.isLoading) {
      return;
    }

    if (stateRef.current.visibleCount < stateRef.current.photosLength) {
      setVisibleCount((current) => {
        const next = Math.min(current + REVEAL_BATCH_SIZE, stateRef.current.photosLength);
        stateRef.current.visibleCount = next;
        return next;
      });
      return;
    }

    if (stateRef.current.hasMoreContent && stateRef.current.nextCursor) {
      fetchPhotoPage(stateRef.current.nextCursor, stateRef.current.photosLength);
    }
  }, [fetchPhotoPage]);

  const openPreview = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const closePreview = useCallback(() => {
    stopPreviewMediaRequests();
    setSelectedIndex(null);
  }, [stopPreviewMediaRequests]);

  const showPrev = useCallback(() => {
    stopPreviewMediaRequests();

    setSelectedIndex((current) => {
      if (current === null || current <= 0) {
        return current;
      }
      return current - 1;
    });
  }, [stopPreviewMediaRequests]);

  const showNext = useCallback(() => {
    stopPreviewMediaRequests();

    setSelectedIndex((current) => {
      if (current === null || current >= orderedPhotos.length - 1) {
        return current;
      }
      return current + 1;
    });
  }, [orderedPhotos.length, stopPreviewMediaRequests]);

  useEffect(() => {
    stateRef.current.visibleCount = visibleCount;
  }, [visibleCount]);

  useEffect(() => {
    stateRef.current.photosLength = photos.length;
  }, [photos.length]);

  useEffect(() => {
    stateRef.current.nextCursor = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    stateRef.current.hasMoreContent = hasMoreContent;
  }, [hasMoreContent]);

  useEffect(() => {
    isMountedRef.current = true;
    imageFailureIdsRef.current.clear();
    setAlbum(null);
    setPhotos([]);
    setVisibleCount(REVEAL_BATCH_SIZE);
    setNextCursor(null);
    setHasMoreContent(true);
    setError(null);
    setSelectedIndex(null);
    setImageFailureCount(0);
    setLoadedMediaIds({});

    stateRef.current = {
      isLoading: false,
      hasMoreContent: true,
      visibleCount: REVEAL_BATCH_SIZE,
      photosLength: 0,
      nextCursor: null,
    };

    fetchPhotoPage(null, 0);

    return () => {
      isMountedRef.current = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [shareId, fetchPhotoPage]);

  useEffect(() => {
    if (!scrollDetectorRef.current) {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !error) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "1000px",
        threshold: 0.1,
      },
    );

    observerRef.current.observe(scrollDetectorRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [error, loadMore]);

  useEffect(() => {
    if (isLoading || error || !scrollDetectorRef.current) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      const rect = scrollDetectorRef.current?.getBoundingClientRect();
      if (rect && rect.top <= window.innerHeight + 1000) {
        loadMore();
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [photos.length, visibleCount, isLoading, error, loadMore]);

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    scrollLockStateRef.current = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePreview();
      } else if (event.key === "ArrowLeft") {
        showPrev();
      } else if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      const lockState = scrollLockStateRef.current;

      if (lockState) {
        window.scrollTo(lockState.scrollX, lockState.scrollY);
        window.requestAnimationFrame(() => {
          window.scrollTo(lockState.scrollX, lockState.scrollY);
        });
        scrollLockStateRef.current = null;
      }

      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPreviewOpen, closePreview, showNext, showPrev]);

  useEffect(() => {
    setPreviewThumbLoaded(false);
    setPreviewFullLoaded(false);
    setPreviewVideoRequested(false);
    setPreviewVideoReady(false);
    setPreviewVideoPlayRequested(false);
    setPreviewVideoStarted(false);
    setPreviewVideoBuffering(false);
    setPreviewVideoLoadProgress(null);
    setPreviewVideoFailed(false);
  }, [selectedPhoto?.id]);

  const registerImageFailure = (photoId: string) => {
    if (imageFailureIdsRef.current.has(photoId)) {
      return;
    }

    imageFailureIdsRef.current.add(photoId);
    setImageFailureCount((current) => current + 1);
  };

  const markMediaLoaded = (photoId: string) => {
    setLoadedMediaIds((current) => {
      if (current[photoId]) {
        return current;
      }

      return {
        ...current,
        [photoId]: true,
      };
    });
  };

  const fallbackMediaSource = (
    event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>,
    fallbackUrl?: string | null,
    onMissingFallback?: () => void,
  ) => {
    const element = event.currentTarget;

    if (!fallbackUrl || element.dataset.fallbackApplied === "true") {
      onMissingFallback?.();
      return;
    }

    element.dataset.fallbackApplied = "true";
    element.src = fallbackUrl;

    if (element instanceof HTMLVideoElement) {
      element.load();
    }
  };

  return (
    <section className={`w-full ${className}`}>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        {showTitle ? (
          <div>
            <h1 className="text-3xl font-bold">{title || album?.title || "相册"}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              已显示 {visiblePhotos.length} 张
              {photos.length > visiblePhotos.length ? `，已缓存 ${photos.length} 张` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            已显示 {visiblePhotos.length} 张
            {photos.length > visiblePhotos.length ? `，已缓存 ${photos.length} 张` : ""}
          </p>
        )}
      </div>

      {networkHint && !error ? (
        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          {networkHint}
        </div>
      ) : null}

      {error && photos.length === 0 ? (
        <div className="rounded-xl bg-red-50 p-6 text-center text-red-700 dark:bg-red-950/30 dark:text-red-200">
          <p className="font-semibold">相册加载失败</p>
          <p className="mt-2 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => fetchPhotoPage(null, 0)}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            重试
          </button>
        </div>
      ) : null}

      {hasLoadedEmptyAlbum ? (
        <div className="rounded-xl bg-amber-50 p-6 text-center text-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">相册里暂时没有可显示的照片</p>
          <p className="mt-2 text-sm">
            Google Photos 返回了空结果，可能是分享链接权限、相册内容或本地网络访问导致的。
          </p>
          <button
            type="button"
            onClick={() => fetchPhotoPage(null, 0)}
            className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            重试
          </button>
        </div>
      ) : null}

      <Masonry
        breakpointCols={breakpointColumns}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {visiblePhotos.map((photo, photoOffset) => {
          const photoOrder = photoOffset + 1;

          return (
          <button
            key={photo.id}
            type="button"
            onClick={() => openPreview(photoOffset)}
            className="group mb-4 block w-full overflow-hidden rounded-xl bg-white text-left shadow-md transition hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800"
          >
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio:
                  photo.width && photo.height ? `${photo.width} / ${photo.height}` : "3 / 4",
              }}
            >
              {!loadedMediaIds[photo.id] ? (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
              ) : null}

              <img
                src={photo.thumbUrl}
                alt={album?.title ? `${album.title} ${photoOrder}` : `相册照片 ${photoOrder}`}
                width={photo.width || undefined}
                height={photo.height || undefined}
                loading="lazy"
                onLoad={() => markMediaLoaded(photo.id)}
                onError={(event) =>
                  fallbackMediaSource(event, photo.fallbackThumbUrl, () => registerImageFailure(photo.id))
                }
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                  loadedMediaIds[photo.id] ? "opacity-100" : "opacity-0"
                }`}
              />

              {photo.mediaType === "video" ? (
                <>
                  <div className="absolute inset-0 bg-black/15 transition group-hover:bg-black/25" />
                  <div className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-xs font-medium text-white">
                    视频
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2 py-1 text-xs font-medium text-white">
                    {formatDuration(photo.durationMs) || "视频"}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-black/65 p-4 text-white shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-8 w-8"
                      >
                        <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </button>
          );
        })}
      </Masonry>

      <div ref={scrollDetectorRef} className="h-4 w-full" aria-hidden="true" />

      {isLoading ? (
        <div className="py-8 text-center text-gray-600 dark:text-gray-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent align-[-0.125em]" />
          <p className="mt-2">加载更多照片...</p>
        </div>
      ) : null}

      {error && photos.length > 0 ? (
        <div className="py-6 text-center text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {!hasMoreContent && visiblePhotos.length >= photos.length && photos.length > 0 ? (
        <div className="py-8 text-center text-gray-600 dark:text-gray-400">
          已加载全部照片
        </div>
      ) : null}

      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          onClick={closePreview}
          style={{
            overscrollBehavior: "contain",
            touchAction: "none",
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closePreview();
            }}
            className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-2 text-sm font-medium text-white hover:bg-black/80"
          >
            关闭
          </button>

          {selectedIndex !== null && selectedIndex > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-white hover:bg-black/80"
            >
              ←
            </button>
          ) : null}

          {selectedIndex !== null && selectedIndex < orderedPhotos.length - 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-white hover:bg-black/80"
            >
              →
            </button>
          ) : null}

          <div
            className="relative flex max-h-full w-full max-w-6xl flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="max-h-[80vh] max-w-full overflow-hidden rounded-2xl shadow-2xl"
              style={{
                width: previewFrameWidth,
              }}
            >
              {selectedPhoto.mediaType === "video" && selectedPhoto.videoUrl ? (
                <div
                  className="relative mx-auto overflow-hidden rounded-2xl bg-black"
                  style={{
                    aspectRatio:
                      selectedPhoto.width && selectedPhoto.height
                        ? `${selectedPhoto.width} / ${selectedPhoto.height}`
                        : "16 / 9",
                    width: "100%",
                    maxWidth: "100%",
                    maxHeight: "80vh",
                  }}
                >
                  <div
                    className={`absolute inset-0 bg-gray-200 transition-opacity duration-300 dark:bg-gray-700 ${
                      previewThumbLoaded ? "pointer-events-none opacity-0" : "opacity-100"
                    }`}
                  />

                  <img
                    ref={previewPosterImageRef}
                    key={`${selectedPhoto.id}-poster`}
                    src={selectedPhoto.previewUrl || selectedPhoto.displayUrl}
                    alt={
                      album?.title && selectedPhotoOrder !== null
                        ? `${album.title} ${selectedPhotoOrder}`
                        : `相册缩略图 ${selectedPhotoOrder ?? ""}`.trim()
                    }
                    onLoad={() => setPreviewThumbLoaded(true)}
                    onError={(event) =>
                      fallbackMediaSource(
                        event,
                        selectedPhoto.fallbackPreviewUrl || selectedPhoto.fallbackDisplayUrl,
                        () => setPreviewThumbLoaded(true),
                      )
                    }
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                      !previewVideoReady ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  {isPreviewVideoOverlayVisible ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/35 px-4 text-white">
                      {isPreviewVideoPlayButtonVisible ? (
                        <button
                          type="button"
                          onClick={requestPreviewVideo}
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-black/75 text-white shadow-lg transition hover:bg-black/90"
                          aria-label={
                            previewVideoFailed
                              ? "重新加载视频"
                              : previewVideoReady
                                ? "播放视频"
                                : "加载视频"
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-8 w-8"
                            aria-hidden="true"
                          >
                            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
                          </svg>
                        </button>
                      ) : null}

                      <div className="rounded-2xl bg-black/70 px-4 py-3 text-center shadow-lg">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                          {isPreviewVideoSpinnerVisible ? (
                            <span
                              className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-r-transparent"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span>{previewVideoStatusText}</span>
                        </div>
                        {previewVideoProgressText ? (
                          <>
                            <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
                              <div
                                className="h-full rounded-full bg-white/90 transition-[width] duration-300"
                                style={{ width: `${previewVideoLoadProgress}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-white/70">{previewVideoProgressText}</p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {previewVideoStarted && isPreviewVideoStatusVisible ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 text-white">
                      <div className="rounded-2xl bg-black/70 px-4 py-3 text-center shadow-lg">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                          {isPreviewVideoSpinnerVisible ? (
                            <span
                              className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-r-transparent"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span>{previewVideoStatusText}</span>
                        </div>
                        {previewVideoProgressText ? (
                          <>
                            <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
                              <div
                                className="h-full rounded-full bg-white/90 transition-[width] duration-300"
                                style={{ width: `${previewVideoLoadProgress}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-white/70">{previewVideoProgressText}</p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <video
                    ref={previewVideoRef}
                    key={selectedPhoto.id}
                    src={previewVideoRequested ? selectedPhoto.videoUrl : undefined}
                    poster={
                      previewVideoRequested
                        ? selectedPhoto.previewUrl || selectedPhoto.displayUrl
                        : undefined
                    }
                    controls={isPreviewVideoControlsVisible}
                    playsInline
                    preload={previewVideoRequested ? "auto" : "none"}
                    onCanPlay={(event) => {
                      setPreviewThumbLoaded(true);
                      setPreviewVideoReady(true);
                      setPreviewVideoBuffering(previewVideoPlayRequested && !previewVideoStarted);
                      setPreviewVideoFailed(false);
                      syncPreviewVideoLoadProgress(event.currentTarget);
                    }}
                    onLoadedMetadata={(event) => {
                      syncPreviewVideoLoadProgress(event.currentTarget);
                    }}
                    onLoadedData={() => {
                      setPreviewThumbLoaded(true);
                      setPreviewVideoReady(true);
                      setPreviewVideoBuffering(previewVideoPlayRequested && !previewVideoStarted);
                      syncPreviewVideoLoadProgress(previewVideoRef.current);
                      setPreviewVideoFailed(false);
                    }}
                    onProgress={(event) => {
                      syncPreviewVideoLoadProgress(event.currentTarget);
                    }}
                    onPlaying={() => {
                      setPreviewThumbLoaded(true);
                      setPreviewVideoReady(true);
                      setPreviewVideoBuffering(!previewVideoStarted);
                      setPreviewVideoFailed(false);
                      syncPreviewVideoLoadProgress(previewVideoRef.current);
                    }}
                    onTimeUpdate={(event) => {
                      syncPreviewVideoPlaybackStarted(event.currentTarget);
                      syncPreviewVideoLoadProgress(event.currentTarget);
                    }}
                    onWaiting={() => {
                      if (!previewVideoFailed) {
                        setPreviewVideoBuffering(true);
                      }
                    }}
                    onStalled={() => {
                      if (!previewVideoFailed) {
                        setPreviewVideoBuffering(true);
                      }
                    }}
                    onSuspend={() => {
                      if (previewVideoRequested && !previewVideoFailed && !previewVideoStarted) {
                        setPreviewVideoBuffering(true);
                      }
                    }}
                    onPause={(event) => {
                      if (event.currentTarget.ended) {
                        return;
                      }

                      if (previewVideoStarted && event.currentTarget.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
                        setPreviewVideoBuffering(false);
                      }
                    }}
                    onSeeked={() => {
                      if (!previewVideoFailed) {
                        setPreviewVideoBuffering(false);
                      }
                      syncPreviewVideoLoadProgress(previewVideoRef.current);
                    }}
                    onSeeking={() => {
                      if (!previewVideoFailed) {
                        setPreviewVideoBuffering(true);
                      }
                    }}
                    onError={(event) => {
                      fallbackMediaSource(event, selectedPhoto.fallbackVideoUrl, () => {
                        setPreviewThumbLoaded(true);
                        setPreviewVideoPlayRequested(false);
                        setPreviewVideoBuffering(false);
                        setPreviewVideoStarted(false);
                        setPreviewVideoFailed(true);
                      });
                    }}
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                      previewVideoReady ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  />
                </div>
              ) : (
                <div
                  className="relative mx-auto overflow-hidden rounded-2xl"
                  style={{
                    aspectRatio:
                      selectedPhoto.width && selectedPhoto.height
                        ? `${selectedPhoto.width} / ${selectedPhoto.height}`
                        : "3 / 4",
                    width: "100%",
                    maxWidth: "100%",
                    maxHeight: "80vh",
                  }}
                >
                  <div
                    className={`absolute inset-0 bg-gray-200 transition-opacity duration-300 dark:bg-gray-700 ${
                      previewThumbLoaded || previewFullLoaded ? "pointer-events-none opacity-0" : "opacity-100"
                    }`}
                  />

                  {previewImageUrl ? (
                    <img
                      ref={previewImageElementRef}
                      key={`${selectedPhoto.id}-${previewImageUrl}`}
                      src={previewImageUrl}
                      alt={
                        album?.title && selectedPhotoOrder !== null
                          ? `${album.title} ${selectedPhotoOrder}`
                          : `相册缩略图 ${selectedPhotoOrder ?? ""}`.trim()
                      }
                      onLoad={() => {
                        setPreviewThumbLoaded(true);

                        if (previewImageUrl === previewFullImageUrl) {
                          setPreviewFullLoaded(true);
                        }
                      }}
                      onError={(event) =>
                        fallbackMediaSource(
                          event,
                          previewImageUrl === selectedPhoto.previewUrl
                            ? selectedPhoto.fallbackPreviewUrl
                            : selectedPhoto.fallbackDisplayUrl,
                          () => setPreviewThumbLoaded(true),
                        )
                      }
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : null}

                  {shouldLoadFullPreviewImage && previewFullImageUrl ? (
                    <img
                      ref={previewFullImageElementRef}
                      key={`${selectedPhoto.id}-${previewFullImageUrl}`}
                      src={previewFullImageUrl}
                      alt={
                        album?.title && selectedPhotoOrder !== null
                          ? `${album.title} ${selectedPhotoOrder}`
                          : `相册照片 ${selectedPhotoOrder ?? ""}`.trim()
                      }
                      onLoad={() => setPreviewFullLoaded(true)}
                      onError={(event) =>
                        fallbackMediaSource(event, selectedPhoto.fallbackOriginalLikeUrl, () =>
                          setPreviewFullLoaded(true),
                        )
                      }
                      className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                        previewFullLoaded ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex w-full max-w-4xl items-center justify-between gap-4 rounded-2xl bg-black/60 px-4 py-3 text-white">
              <div>
                <p className="text-sm font-medium">
                  {selectedPhoto.mediaType === "video" ? "视频" : "图片"} #{selectedPhotoOrder}
                </p>
                <p className="text-xs text-white/70">
                  {selectedPhoto.takenAt
                    ? new Date(selectedPhoto.takenAt).toLocaleString()
                    : "未知拍摄时间"}
                </p>
              </div>

              <a
                href={selectedPhoto.videoUrl || selectedPhoto.originalLikeUrl || selectedPhoto.displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                新窗口打开
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PhotoAlbumMasonry;
