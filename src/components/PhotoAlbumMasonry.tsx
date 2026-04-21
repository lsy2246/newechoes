import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Masonry from "react-masonry-css";

interface PhotoAlbumMasonryProps {
  shareUrl: string;
  title?: string;
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
  displayUrl: string;
  previewUrl: string;
  originalLikeUrl: string | null;
  videoUrl: string | null;
}

interface AlbumInfo {
  title: string | null;
}

interface AlbumResponse {
  album: AlbumInfo;
  photos: PhotoItem[];
  nextCursor: string | null;
}

const REVEAL_BATCH_SIZE = 15;
const CLIENT_TIMEOUT_MS = 12000;

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

const PhotoAlbumMasonry: React.FC<PhotoAlbumMasonryProps> = ({
  shareUrl,
  title,
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
  const [previewVideoReady, setPreviewVideoReady] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollDetectorRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const imageFailureIdsRef = useRef(new Set<string>());

  const stateRef = useRef({
    isLoading: false,
    hasMoreContent: true,
    visibleCount: REVEAL_BATCH_SIZE,
    photosLength: 0,
    nextCursor: null as string | null,
  });

  const visiblePhotos = useMemo(
    () => photos.slice(0, visibleCount),
    [photos, visibleCount],
  );

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;
  const networkHint =
    imageFailureCount >= 3
      ? "检测到多张图片加载失败，当前网络可能无法访问 Google Photos 资源。"
      : null;
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
          shareUrl,
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
    [shareUrl],
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
    setSelectedIndex(null);
  }, []);

  const showPrev = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || current <= 0) {
        return current;
      }
      return current - 1;
    });
  }, []);

  const showNext = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || current >= photos.length - 1) {
        return current;
      }
      return current + 1;
    });
  }, [photos.length]);

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
  }, [shareUrl, fetchPhotoPage]);

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
    if (selectedIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedIndex, closePreview, showNext, showPrev]);

  useEffect(() => {
    if (!selectedPhoto) {
      setPreviewThumbLoaded(false);
      setPreviewFullLoaded(false);
      setPreviewVideoReady(false);
      return;
    }

    setPreviewThumbLoaded(false);
    setPreviewFullLoaded(false);
    setPreviewVideoReady(false);

    let disposed = false;
    const preloadImage = (src: string | null, onDone: () => void) => {
      if (!src) {
        return null;
      }

      const image = new window.Image();
      image.decoding = "async";
      image.src = src;

      const finish = () => {
        if (disposed) {
          return;
        }

        onDone();
      };

      const finishAfterDecode = () => {
        if (typeof image.decode === "function") {
          image.decode().catch(() => undefined).finally(finish);
          return;
        }

        finish();
      };

      if (image.complete && image.naturalWidth > 0) {
        finishAfterDecode();
        return image;
      }

      image.onload = finishAfterDecode;
      image.onerror = finish;
      return image;
    };

    const loadedImages: HTMLImageElement[] = [];

    if (selectedPhoto.mediaType === "video") {
      const posterImage = preloadImage(selectedPhoto.previewUrl || selectedPhoto.displayUrl, () => {
        setPreviewThumbLoaded(true);
      });

      if (posterImage) {
        loadedImages.push(posterImage);
      }
    } else {
      const previewSource = selectedPhoto.previewUrl || selectedPhoto.displayUrl;
      const fullSource = selectedPhoto.originalLikeUrl || previewSource;

      if (previewSource && previewSource === fullSource) {
        const fullImage = preloadImage(fullSource, () => {
          setPreviewThumbLoaded(true);
          setPreviewFullLoaded(true);
        });

        if (fullImage) {
          loadedImages.push(fullImage);
        }
      } else {
        const previewImage = preloadImage(previewSource, () => {
          setPreviewThumbLoaded(true);
        });
        const fullImage = preloadImage(fullSource, () => {
          setPreviewThumbLoaded(true);
          setPreviewFullLoaded(true);
        });

        if (previewImage) {
          loadedImages.push(previewImage);
        }

        if (fullImage) {
          loadedImages.push(fullImage);
        }
      }
    }

    return () => {
      disposed = true;
      loadedImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [selectedPhoto]);

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

  return (
    <section className={`w-full ${className}`}>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title || album?.title || "相册"}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            已显示 {visiblePhotos.length} 张
            {photos.length > visiblePhotos.length ? `，已缓存 ${photos.length} 张` : ""}
          </p>
        </div>
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

      <Masonry
        breakpointCols={breakpointColumns}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {visiblePhotos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => openPreview(photo.index - 1)}
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
                alt={album?.title ? `${album.title} ${photo.index}` : `相册照片 ${photo.index}`}
                width={photo.width || undefined}
                height={photo.height || undefined}
                loading="lazy"
                onLoad={() => markMediaLoaded(photo.id)}
                onError={() => registerImageFailure(photo.id)}
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
        ))}
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={closePreview}
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

          {selectedIndex !== null && selectedIndex < photos.length - 1 ? (
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
            <div className="max-h-[80vh] w-full overflow-hidden rounded-2xl shadow-2xl">
              {selectedPhoto.mediaType === "video" && selectedPhoto.videoUrl ? (
                <div
                  className="relative mx-auto overflow-hidden rounded-2xl"
                  style={{
                    aspectRatio:
                      selectedPhoto.width && selectedPhoto.height
                        ? `${selectedPhoto.width} / ${selectedPhoto.height}`
                        : "16 / 9",
                    width: previewFrameWidth,
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
                    src={selectedPhoto.previewUrl || selectedPhoto.displayUrl}
                    alt={album?.title ? `${album.title} ${selectedPhoto.index}` : `相册缩略图 ${selectedPhoto.index}`}
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                      !previewVideoReady ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  <video
                    src={selectedPhoto.videoUrl}
                    poster={selectedPhoto.previewUrl || selectedPhoto.displayUrl}
                    controls
                    autoPlay
                    playsInline
                    onLoadedData={() => {
                      setPreviewThumbLoaded(true);
                      setPreviewVideoReady(true);
                    }}
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                      previewVideoReady ? "opacity-100" : "opacity-0"
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
                    width: previewFrameWidth,
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
                      src={previewImageUrl}
                      alt={album?.title ? `${album.title} ${selectedPhoto.index}` : `相册缩略图 ${selectedPhoto.index}`}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : null}

                  {previewFullImageUrl ? (
                    <img
                      src={previewFullImageUrl}
                      alt={album?.title ? `${album.title} ${selectedPhoto.index}` : `相册照片 ${selectedPhoto.index}`}
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
                  {selectedPhoto.mediaType === "video" ? "视频" : "图片"} #{selectedPhoto.index}
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
