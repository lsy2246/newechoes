const HOME_DIORAMA_MODULE_KEY = "__homeDioramaModule";
const HOME_DIORAMA_ACTIVE_SCENE_KEY = "__homeDioramaActiveScene";
const HOME_DIORAMA_BOOT_CLEANUP_KEY = "__homeDioramaBootCleanup";
const HOME_DIORAMA_BOOT_DELAY_MS = 180;

const isHomePath = (window) => {
  const path = window.location.pathname;
  return path === "/" || path === "";
};

export function mountHomeDioramaBoot({
  window: providedWindow,
  document: providedDocument,
  importDiorama = () => import("./diorama"),
} = {}) {
  const window = providedWindow ?? globalThis.window;
  const document = providedDocument ?? globalThis.document;
  if (!window || !document) return () => {};

  const previousCleanup = window[HOME_DIORAMA_BOOT_CLEANUP_KEY];
  if (typeof previousCleanup === "function") previousCleanup();

  let scheduledBootId = 0;
  let loadListenerAttached = false;
  let disposed = false;

  const getSceneElement = () => document.querySelector("[data-home-scene]");
  const getLoadingElement = () => document.querySelector("[data-home-loading]");
  const getLoadingDetailElement = () => document.querySelector("[data-home-loading-detail]");

  const setLoadingState = (state) => {
    const loadingElement = getLoadingElement();
    if (!loadingElement) return;
    loadingElement.setAttribute("data-home-loading-state", state);
  };

  const showBootError = () => {
    setLoadingState("error");
    const detailElement = getLoadingDetailElement();
    if (detailElement) {
      detailElement.textContent = "首页场景加载失败，请刷新页面重试。";
    }
  };

  const resetDioramaState = () => {
    window[HOME_DIORAMA_ACTIVE_SCENE_KEY] = null;
  };

  const cancelScheduledBoot = () => {
    if (scheduledBootId) {
      window.clearTimeout(scheduledBootId);
      scheduledBootId = 0;
    }
    if (loadListenerAttached) {
      window.removeEventListener("load", handleWindowLoad);
      loadListenerAttached = false;
    }
  };

  const maybeInit = async () => {
    if (disposed) return;
    const sceneElement = getSceneElement();
    if (!isHomePath(window) || !sceneElement) return;
    if (window[HOME_DIORAMA_ACTIVE_SCENE_KEY] === sceneElement) return;

    try {
      window[HOME_DIORAMA_MODULE_KEY] ??= importDiorama();
      const { initDiorama } = await window[HOME_DIORAMA_MODULE_KEY];

      if (disposed) return;
      if (!isHomePath(window) || getSceneElement() !== sceneElement) return;
      if (window[HOME_DIORAMA_ACTIVE_SCENE_KEY] === sceneElement) return;
      window[HOME_DIORAMA_ACTIVE_SCENE_KEY] = sceneElement;
      initDiorama();
    } catch (error) {
      if (disposed) return;
      window[HOME_DIORAMA_MODULE_KEY] = null;
      resetDioramaState();
      showBootError();
      console.error("Home diorama boot failed:", error);
    }
  };

  const startBoot = () => {
    scheduledBootId = 0;
    void maybeInit();
  };

  const queueBoot = () => {
    cancelScheduledBoot();
    if (disposed) return;
    if (!isHomePath(window) || !getSceneElement()) return;
    scheduledBootId = window.setTimeout(startBoot, HOME_DIORAMA_BOOT_DELAY_MS);
  };

  function handleWindowLoad() {
    loadListenerAttached = false;
    queueBoot();
  }

  const scheduleBoot = () => {
    cancelScheduledBoot();
    if (disposed) return;
    if (!isHomePath(window) || !getSceneElement()) return;
    setLoadingState("loading");

    if (document.readyState === "complete") {
      queueBoot();
      return;
    }

    window.addEventListener("load", handleWindowLoad, { once: true });
    loadListenerAttached = true;
  };

  const handleNavigationIntent = (event) => {
    if (disposed || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link) return;

    const nextUrl = new URL(link.href, window.location.href);
    if (nextUrl.origin !== window.location.origin) return;
    if (nextUrl.pathname !== window.location.pathname) {
      cancelScheduledBoot();
      resetDioramaState();
    }
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelScheduledBoot();
    resetDioramaState();
    document.removeEventListener("click", handleNavigationIntent, true);
    document.removeEventListener("astro:before-swap", cleanup);
    document.removeEventListener("swup:visit:start", cleanup);
    window.removeEventListener("pagehide", cleanup);
    window.removeEventListener("beforeunload", cleanup);
    if (window[HOME_DIORAMA_BOOT_CLEANUP_KEY] === cleanup) {
      delete window[HOME_DIORAMA_BOOT_CLEANUP_KEY];
    }
  };

  window[HOME_DIORAMA_BOOT_CLEANUP_KEY] = cleanup;

  document.addEventListener("click", handleNavigationIntent, true);
  document.addEventListener("astro:before-swap", cleanup, { once: true });
  document.addEventListener("swup:visit:start", cleanup, { once: true });
  window.addEventListener("pagehide", cleanup, { once: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  scheduleBoot();
  return cleanup;
}
