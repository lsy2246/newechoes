import {
  clampMediaTransform,
  fitMediaToStage,
  zoomMediaAtPoint,
  type MediaPoint,
  type MediaSize,
  type MediaTransform,
} from "./article-media-transform.ts";

declare global {
  interface Window {
    __articleMediaViewerCleanup?: () => void;
  }
}

type ArticleMediaSource = HTMLImageElement | HTMLPreElement;

type MediaDecorationState = {
  zoomable: string | null;
  tabindex: string | null;
  role: string | null;
  ariaLabel: string | null;
};

type DragStart = {
  point: MediaPoint;
  transform: MediaTransform;
};

type PinchStart = {
  center: MediaPoint;
  distance: number;
  transform: MediaTransform;
};

const ZOOMABLE_ATTRIBUTE = "data-article-media-zoomable";
const READY_MERMAID_SELECTOR = 'pre.mermaid[data-mermaid-state="ready"]';
const MAX_SCALE = 4;
const ZOOM_STEP = 1.22;
let cloneSequence = 0;

const VIEWER_MARKUP = `
  <button class="article-media-viewer__button article-media-viewer__close" type="button" aria-label="关闭" data-media-viewer-action="close">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
  </button>
  <div class="article-media-viewer__stage" tabindex="0" autofocus aria-label="可缩放媒体区域" data-media-viewer-stage>
    <div class="article-media-viewer__media" data-media-viewer-media></div>
  </div>
  <div class="article-media-viewer__controls" aria-label="缩放控制">
    <button class="article-media-viewer__button" type="button" aria-label="缩小" data-media-viewer-action="zoom-out">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
    </button>
    <output class="article-media-viewer__scale" data-media-viewer-scale>100%</output>
    <button class="article-media-viewer__button" type="button" aria-label="放大" data-media-viewer-action="zoom-in">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
    <button class="article-media-viewer__button article-media-viewer__reset" type="button" aria-label="复位" data-media-viewer-action="reset">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6M5.8 15.5A7 7 0 0 0 17.7 18M18.2 8.5A7 7 0 0 0 6.3 6" /></svg>
      <span>复位</span>
    </button>
  </div>
`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getElementsIncludingRoot(root: Element) {
  return [root, ...Array.from(root.querySelectorAll("*"))];
}

export function rewriteSvgFragmentReferences(
  svg: SVGSVGElement,
  prefix: string,
) {
  const idMap = new Map<string, string>();

  getElementsIncludingRoot(svg).forEach((element) => {
    const id = element.getAttribute("id");
    if (!id) return;

    const nextId = `${prefix}${id}`;
    idMap.set(id, nextId);
    element.setAttribute("id", nextId);
  });

  const orderedIds = Array.from(idMap.entries()).sort(
    ([left], [right]) => right.length - left.length,
  );

  getElementsIncludingRoot(svg).forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name === "id") return;

      let nextValue = attribute.value;
      orderedIds.forEach(([previousId, nextId]) => {
        nextValue = nextValue.replace(
          new RegExp(`#${escapeRegExp(previousId)}(?![\\w-])`, "g"),
          `#${nextId}`,
        );

        if (
          attribute.name === "aria-labelledby"
          || attribute.name === "aria-describedby"
        ) {
          nextValue = nextValue
            .split(/\s+/)
            .map((token) => (token === previousId ? nextId : token))
            .join(" ");
        }
      });

      if (nextValue !== attribute.value) {
        element.setAttribute(attribute.name, nextValue);
      }
    });
  });

  svg.querySelectorAll("style").forEach((style) => {
    let css = style.textContent || "";
    orderedIds.forEach(([previousId, nextId]) => {
      css = css.replace(
        new RegExp(`#${escapeRegExp(previousId)}(?![\\w-])`, "g"),
        `#${nextId}`,
      );
    });
    style.textContent = css;
  });
}

function getSvgSize(svg: SVGSVGElement): MediaSize {
  const viewBox = svg.getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);

  if (
    viewBox?.length === 4
    && Number.isFinite(viewBox[2])
    && Number.isFinite(viewBox[3])
    && viewBox[2] > 0
    && viewBox[3] > 0
  ) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  const bounds = svg.getBoundingClientRect();
  return {
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
  };
}

function cloneMermaidSvg(source: HTMLPreElement) {
  const sourceSvg = source.querySelector<SVGSVGElement>("svg");
  if (!sourceSvg) return null;

  const svg = sourceSvg.cloneNode(true) as SVGSVGElement;
  cloneSequence += 1;
  rewriteSvgFragmentReferences(
    svg,
    `article-media-viewer-${cloneSequence}-`,
  );

  const size = getSvgSize(sourceSvg);
  const viewBox = svg.getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.classList.add("article-media-viewer__mermaid-background");
  background.setAttribute(
    "x",
    String(viewBox?.length === 4 && Number.isFinite(viewBox[0]) ? viewBox[0] : 0),
  );
  background.setAttribute(
    "y",
    String(viewBox?.length === 4 && Number.isFinite(viewBox[1]) ? viewBox[1] : 0),
  );
  background.setAttribute("width", String(size.width));
  background.setAttribute("height", String(size.height));
  background.setAttribute("aria-hidden", "true");
  svg.prepend(background);

  svg.setAttribute("width", String(size.width));
  svg.setAttribute("height", String(size.height));
  svg.style.width = `${size.width}px`;
  svg.style.height = `${size.height}px`;
  svg.style.maxWidth = "none";
  svg.style.overflow = "visible";
  svg.setAttribute("aria-hidden", "true");

  return { element: svg, size, kind: "mermaid" as const };
}

function cloneRasterImage(source: HTMLImageElement) {
  const src = source.currentSrc || source.src;
  const width = source.naturalWidth;
  const height = source.naturalHeight;
  if (!src || width <= 0 || height <= 0) return null;

  const image = document.createElement("img");
  image.src = src;
  image.alt = source.alt || "";
  image.decoding = "async";
  image.draggable = false;
  image.width = width;
  image.height = height;
  image.style.width = `${width}px`;
  image.style.height = `${height}px`;

  return {
    element: image,
    size: { width, height },
    kind: "image" as const,
  };
}

function isStandaloneImage(source: HTMLImageElement) {
  return !source.closest("a, button")
    && !source.closest(".article-media-viewer");
}

function getZoomableSource(target: EventTarget | null): ArticleMediaSource | null {
  if (!(target instanceof Element)) return null;

  const source = target.closest<ArticleMediaSource>(
    `img[${ZOOMABLE_ATTRIBUTE}="true"], ${READY_MERMAID_SELECTOR}[${ZOOMABLE_ATTRIBUTE}="true"]`,
  );
  if (!source) return null;

  if (source instanceof HTMLImageElement) {
    return isStandaloneImage(source) ? source : null;
  }

  return source.querySelector("svg") ? source : null;
}

function decorateMediaSource(
  source: ArticleMediaSource,
  label: string,
  decorationStates: WeakMap<ArticleMediaSource, MediaDecorationState>,
  decoratedSources: Set<ArticleMediaSource>,
) {
  if (!decorationStates.has(source)) {
    decorationStates.set(source, {
      zoomable: source.getAttribute(ZOOMABLE_ATTRIBUTE),
      tabindex: source.getAttribute("tabindex"),
      role: source.getAttribute("role"),
      ariaLabel: source.getAttribute("aria-label"),
    });
    decoratedSources.add(source);
  }

  source.setAttribute(ZOOMABLE_ATTRIBUTE, "true");
  if (!source.hasAttribute("tabindex")) source.tabIndex = 0;
  if (!source.hasAttribute("role")) source.setAttribute("role", "button");
  if (!source.hasAttribute("aria-label")) {
    source.setAttribute("aria-label", label);
  }
}

function restoreAttribute(
  source: ArticleMediaSource,
  name: string,
  value: string | null,
) {
  if (value === null) {
    source.removeAttribute(name);
  } else {
    source.setAttribute(name, value);
  }
}

function restoreMediaDecoration(
  source: ArticleMediaSource,
  decorationStates: WeakMap<ArticleMediaSource, MediaDecorationState>,
  decoratedSources: Set<ArticleMediaSource>,
) {
  const state = decorationStates.get(source);
  if (!state) return;

  restoreAttribute(source, ZOOMABLE_ATTRIBUTE, state.zoomable);
  restoreAttribute(source, "tabindex", state.tabindex);
  restoreAttribute(source, "role", state.role);
  restoreAttribute(source, "aria-label", state.ariaLabel);
  decorationStates.delete(source);
  decoratedSources.delete(source);
}

function reconcileMediaDecorations(
  prose: HTMLElement,
  decorationStates: WeakMap<ArticleMediaSource, MediaDecorationState>,
  decoratedSources: Set<ArticleMediaSource>,
) {
  decoratedSources.forEach((source) => {
    if (!prose.contains(source)) {
      restoreMediaDecoration(source, decorationStates, decoratedSources);
    }
  });

  prose.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (isStandaloneImage(image)) {
      const description = image.alt.trim();
      decorateMediaSource(
        image,
        description ? `放大图片：${description}` : "放大图片",
        decorationStates,
        decoratedSources,
      );
    } else {
      restoreMediaDecoration(image, decorationStates, decoratedSources);
    }
  });

  prose.querySelectorAll<HTMLPreElement>("pre.mermaid").forEach((diagram) => {
    if (diagram.matches(READY_MERMAID_SELECTOR) && diagram.querySelector("svg")) {
      decorateMediaSource(
        diagram,
        "放大 Mermaid 图表",
        decorationStates,
        decoratedSources,
      );
    } else {
      restoreMediaDecoration(diagram, decorationStates, decoratedSources);
    }
  });
}

function getPointerDistance(left: MediaPoint, right: MediaPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function getPointerCenter(left: MediaPoint, right: MediaPoint): MediaPoint {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
}

export function initArticleMediaViewer() {
  if (typeof window === "undefined") return;

  window.__articleMediaViewerCleanup?.();

  const prose = document.querySelector<HTMLElement>(".article-prose");
  if (!prose || !document.body) return;

  let active = true;
  let currentSource: ArticleMediaSource | null = null;
  let mediaElement: HTMLElement | SVGSVGElement | null = null;
  let mediaSize: MediaSize = { width: 1, height: 1 };
  let transform: MediaTransform = { scale: 1, x: 0, y: 0 };
  let minimumScale = 0.05;
  let maximumScale = MAX_SCALE;
  let dragStart: DragStart | null = null;
  let pinchStart: PinchStart | null = null;
  let pageScrollLocked = false;
  let restoreFocusAfterClose = true;
  const pointers = new Map<number, MediaPoint>();
  const decorationStates = new WeakMap<
    ArticleMediaSource,
    MediaDecorationState
  >();
  const decoratedSources = new Set<ArticleMediaSource>();
  const abortController = new AbortController();
  const { signal } = abortController;

  const dialog = document.createElement("dialog");
  dialog.className = "article-media-viewer";
  dialog.setAttribute("aria-label", "媒体查看器");
  dialog.innerHTML = VIEWER_MARKUP;
  document.body.appendChild(dialog);

  const stage = dialog.querySelector<HTMLElement>("[data-media-viewer-stage]");
  const media = dialog.querySelector<HTMLElement>("[data-media-viewer-media]");
  const scaleOutput = dialog.querySelector<HTMLOutputElement>("[data-media-viewer-scale]");
  const controls = dialog.querySelector<HTMLElement>(".article-media-viewer__controls");

  if (!stage || !media || !scaleOutput || !controls) {
    dialog.remove();
    return;
  }

  const getStageSize = (): MediaSize => {
    const bounds = stage.getBoundingClientRect();
    return {
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height),
    };
  };

  const getStagePoint = (clientX: number, clientY: number): MediaPoint => {
    const bounds = stage.getBoundingClientRect();
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  };

  const renderTransform = () => {
    if (!mediaElement) return;

    if (mediaElement instanceof SVGSVGElement) {
      mediaElement.style.width = `${mediaSize.width * transform.scale}px`;
      mediaElement.style.height = `${mediaSize.height * transform.scale}px`;
      mediaElement.style.left = `${transform.x}px`;
      mediaElement.style.top = `${transform.y}px`;
      mediaElement.style.transform = "none";
    } else {
      mediaElement.style.transform =
        `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
    }
    scaleOutput.value = `${Math.round(transform.scale * 100)}%`;
    scaleOutput.textContent = scaleOutput.value;
  };

  const resetTransform = () => {
    if (!mediaElement) return;

    transform = fitMediaToStage(mediaSize, getStageSize(), 24);
    minimumScale = Math.max(0.05, transform.scale * 0.5);
    maximumScale = Math.max(MAX_SCALE, transform.scale * 8);
    renderTransform();
  };

  const zoomTo = (requestedScale: number, point?: MediaPoint) => {
    if (!mediaElement) return;

    const stageSize = getStageSize();
    const anchor = point || {
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    };
    transform = zoomMediaAtPoint(
      transform,
      mediaSize,
      stageSize,
      anchor,
      requestedScale,
      minimumScale,
      maximumScale,
    );
    renderTransform();
  };

  const clearPointerState = () => {
    pointers.clear();
    dragStart = null;
    pinchStart = null;
    stage.classList.remove("is-dragging");
  };

  const acquirePageScrollLock = () => {
    if (pageScrollLocked) return;
    pageScrollLocked = true;
    document.documentElement.classList.add("article-media-viewer-open");
  };

  const releasePageScrollLock = () => {
    if (!pageScrollLocked) return;
    pageScrollLocked = false;
    document.documentElement.classList.remove("article-media-viewer-open");
  };

  const clearViewerState = () => {
    releasePageScrollLock();
    media.replaceChildren();
    media.classList.remove("mermaid");
    mediaElement = null;
    clearPointerState();

    const source = currentSource;
    currentSource = null;
    const shouldRestoreFocus = restoreFocusAfterClose;
    restoreFocusAfterClose = true;
    if (active && shouldRestoreFocus && source?.isConnected) {
      source.focus({ preventScroll: true });
    }
  };

  const closeViewer = () => {
    if (dialog.open) {
      dialog.close();
    } else {
      clearViewerState();
    }
  };

  const closeViewerForNavigation = () => {
    restoreFocusAfterClose = false;
    closeViewer();
  };

  const openViewer = (source: ArticleMediaSource) => {
    const cloned = source instanceof HTMLImageElement
      ? cloneRasterImage(source)
      : cloneMermaidSvg(source);
    if (!cloned) return;

    restoreFocusAfterClose = true;
    currentSource = source;
    mediaElement = cloned.element;
    mediaSize = cloned.size;
    media.classList.toggle("mermaid", cloned.kind === "mermaid");
    media.replaceChildren(cloned.element);
    dialog.setAttribute(
      "aria-label",
      cloned.kind === "mermaid" ? "Mermaid 图表查看器" : "图片查看器",
    );

    acquirePageScrollLock();
    if (!dialog.open) dialog.showModal();
    stage.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      if (!active || !dialog.open || currentSource !== source) return;
      resetTransform();
    });
  };

  const handleSourceActivation = (event: Event) => {
    const source = getZoomableSource(event.target);
    if (!source) return;

    event.preventDefault();
    event.stopPropagation();
    openViewer(source);
  };

  prose.addEventListener("click", handleSourceActivation, { signal });
  prose.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        handleSourceActivation(event);
      }
    },
    { signal },
  );

  controls.addEventListener(
    "click",
    (event) => {
      const button = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("[data-media-viewer-action]")
        : null;
      const action = button?.dataset.mediaViewerAction;
      if (action === "zoom-out") zoomTo(transform.scale / ZOOM_STEP);
      if (action === "zoom-in") zoomTo(transform.scale * ZOOM_STEP);
      if (action === "reset") resetTransform();
    },
    { signal },
  );

  dialog
    .querySelector<HTMLButtonElement>('[data-media-viewer-action="close"]')
    ?.addEventListener("click", closeViewer, { signal });

  dialog.addEventListener(
    "click",
    (event) => {
      if (event.target === dialog) closeViewer();
    },
    { signal },
  );
  dialog.addEventListener("close", clearViewerState, { signal });
  dialog.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomTo(transform.scale * ZOOM_STEP);
      }
      if (event.key === "-") {
        event.preventDefault();
        zoomTo(transform.scale / ZOOM_STEP);
      }
      if (event.key === "0") {
        event.preventDefault();
        resetTransform();
      }
    },
    { signal },
  );

  stage.addEventListener(
    "wheel",
    (event) => {
      if (!mediaElement) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomTo(
        transform.scale * factor,
        getStagePoint(event.clientX, event.clientY),
      );
    },
    { passive: false, signal },
  );

  stage.addEventListener(
    "pointerdown",
    (event) => {
      if (!mediaElement) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const point = getStagePoint(event.clientX, event.clientY);
      pointers.set(event.pointerId, point);
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");

      if (pointers.size === 1) {
        dragStart = { point, transform: { ...transform } };
        pinchStart = null;
      } else if (pointers.size >= 2) {
        const [left, right] = Array.from(pointers.values());
        pinchStart = {
          center: getPointerCenter(left, right),
          distance: Math.max(1, getPointerDistance(left, right)),
          transform: { ...transform },
        };
        dragStart = null;
      }
    },
    { signal },
  );

  stage.addEventListener(
    "pointermove",
    (event) => {
      if (!mediaElement || !pointers.has(event.pointerId)) return;

      pointers.set(
        event.pointerId,
        getStagePoint(event.clientX, event.clientY),
      );

      if (pointers.size >= 2 && pinchStart) {
        const [left, right] = Array.from(pointers.values());
        const center = getPointerCenter(left, right);
        const distance = Math.max(1, getPointerDistance(left, right));
        const requestedScale = pinchStart.transform.scale
          * (distance / pinchStart.distance);
        const anchored = zoomMediaAtPoint(
          pinchStart.transform,
          mediaSize,
          getStageSize(),
          pinchStart.center,
          requestedScale,
          minimumScale,
          maximumScale,
        );
        transform = clampMediaTransform(
          {
            ...anchored,
            x: anchored.x + center.x - pinchStart.center.x,
            y: anchored.y + center.y - pinchStart.center.y,
          },
          mediaSize,
          getStageSize(),
        );
        renderTransform();
        return;
      }

      if (pointers.size === 1 && dragStart) {
        const [point] = pointers.values();
        transform = clampMediaTransform(
          {
            ...dragStart.transform,
            x: dragStart.transform.x + point.x - dragStart.point.x,
            y: dragStart.transform.y + point.y - dragStart.point.y,
          },
          mediaSize,
          getStageSize(),
        );
        renderTransform();
      }
    },
    { signal },
  );

  const releasePointer = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }

    pinchStart = null;
    if (pointers.size === 1) {
      const [point] = pointers.values();
      dragStart = { point, transform: { ...transform } };
    } else {
      dragStart = null;
      stage.classList.remove("is-dragging");
    }
  };

  stage.addEventListener("pointerup", releasePointer, { signal });
  stage.addEventListener("pointercancel", releasePointer, { signal });
  window.addEventListener("resize", resetTransform, { signal });
  window.visualViewport?.addEventListener("resize", resetTransform, { signal });

  reconcileMediaDecorations(prose, decorationStates, decoratedSources);
  const observer = new MutationObserver(() => {
    reconcileMediaDecorations(prose, decorationStates, decoratedSources);
  });
  observer.observe(prose, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-mermaid-state"],
  });

  const cleanup = () => {
    if (!active) return;
    active = false;
    observer.disconnect();
    releasePageScrollLock();
    abortController.abort();
    if (dialog.open) dialog.close();
    dialog.remove();
    clearPointerState();
    decoratedSources.forEach((source) => {
      restoreMediaDecoration(source, decorationStates, decoratedSources);
    });

    if (window.__articleMediaViewerCleanup === cleanup) {
      delete window.__articleMediaViewerCleanup;
    }
  };

  document.addEventListener("astro:before-swap", cleanup, {
    once: true,
    signal,
  });
  document.addEventListener("swup:visit:start", closeViewerForNavigation, {
    signal,
  });
  document.addEventListener("swup:content:replace", cleanup, {
    once: true,
    signal,
  });
  window.addEventListener("beforeunload", cleanup, {
    once: true,
    signal,
  });

  window.__articleMediaViewerCleanup = cleanup;
}
