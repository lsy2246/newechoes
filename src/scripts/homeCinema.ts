const PHASES = {
  init: [0, 0.12],
  build: [0.12, 0.28],
  tunnel: [0.28, 0.45],
  breach: [0.45, 0.62],
  hall: [0.62, 0.88],
  reveal: [0.88, 0.96],
  settle: [0.96, 1],
} as const;

const CLEANUP_KEY = "__homeCinemaCleanup";
const MAX_PROGRESS = 1;
const MIN_PROGRESS = 0;
const SCROLL_STEP = 0.00012;
const TOUCH_STEP = 0.00024;
const KEYBOARD_STEP = 0.042;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function phaseProgress(progress: number, start: number, end: number) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function initCinema() {
  if (typeof window === "undefined") {
    return () => {};
  }

  const previousCleanup = (window as typeof window & { [CLEANUP_KEY]?: () => void })[CLEANUP_KEY];
  if (typeof previousCleanup === "function") {
    previousCleanup();
  }

  const shell = document.querySelector<HTMLElement>("[data-home-shell]");
  const stage = document.querySelector<HTMLElement>("[data-home-stage]");
  const header = document.querySelector<HTMLElement>("[data-home-header]");

  if (!shell || !stage) {
    return () => {};
  }

  let frame = 0;
  let progress = 0;
  let targetProgress = 0;
  let touchStartY: number | null = null;

  const applyProgress = () => {
    const initP = easeOutCubic(phaseProgress(progress, ...PHASES.init));
    const buildP = easeOutCubic(phaseProgress(progress, ...PHASES.build));
    const tunnelP = easeInOutCubic(phaseProgress(progress, ...PHASES.tunnel));
    const breachP = easeInOutCubic(phaseProgress(progress, ...PHASES.breach));
    const hallP = easeOutCubic(phaseProgress(progress, ...PHASES.hall));
    const revealP = easeOutCubic(phaseProgress(progress, ...PHASES.reveal));
    const settleP = easeOutCubic(phaseProgress(progress, ...PHASES.settle));

    stage.style.setProperty("--progress", progress.toFixed(4));
    stage.style.setProperty("--init-progress", initP.toFixed(4));
    stage.style.setProperty("--build-progress", buildP.toFixed(4));
    stage.style.setProperty("--tunnel-progress", tunnelP.toFixed(4));
    stage.style.setProperty("--breach-progress", breachP.toFixed(4));
    stage.style.setProperty("--hall-progress", hallP.toFixed(4));
    stage.style.setProperty("--reveal-progress", revealP.toFixed(4));
    stage.style.setProperty("--settle-progress", settleP.toFixed(4));

    const cameraDepth = initP * 0.16 + buildP * 0.26 + tunnelP * 0.58 + breachP * 0.32;
    stage.style.setProperty("--camera-depth", cameraDepth.toFixed(4));

    const hallExposure = clamp(breachP * 0.72 + hallP * 0.58);
    stage.style.setProperty("--hall-exposure", hallExposure.toFixed(4));

    const identityVisibility = clamp(revealP * 0.88 + settleP * 0.22);
    stage.style.setProperty("--identity-visibility", identityVisibility.toFixed(4));

    const exitsVisibility = easeOutCubic(phaseProgress(progress, 0.9, 1));
    stage.style.setProperty("--exits-visibility", exitsVisibility.toFixed(4));

    if (header) {
      const headerOpacity = easeOutCubic(phaseProgress(progress, 0.94, 1));
      header.style.setProperty("--home-header-opacity", headerOpacity.toFixed(4));
      header.classList.toggle("is-home-hidden", headerOpacity < 0.08);
      header.classList.toggle("is-dense", progress > 0.9);
    }
  };

  const updateFrame = () => {
    frame = 0;
    const delta = targetProgress - progress;

    if (Math.abs(delta) < 0.0006) {
      progress = targetProgress;
      applyProgress();
      return;
    }

    progress += delta * 0.12;
    applyProgress();
    requestUpdate();
  };

  const requestUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(updateFrame);
  };

  const adjustProgress = (delta: number) => {
    targetProgress = clamp(targetProgress + delta, MIN_PROGRESS, MAX_PROGRESS);
    requestUpdate();
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    adjustProgress(event.deltaY * SCROLL_STEP);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (["ArrowDown", "PageDown", "Space"].includes(event.code)) {
      event.preventDefault();
      adjustProgress(KEYBOARD_STEP);
      return;
    }

    if (["ArrowUp", "PageUp"].includes(event.code)) {
      event.preventDefault();
      adjustProgress(-KEYBOARD_STEP);
      return;
    }

    if (event.code === "Home") {
      event.preventDefault();
      targetProgress = MIN_PROGRESS;
      requestUpdate();
      return;
    }

    if (event.code === "End") {
      event.preventDefault();
      targetProgress = MAX_PROGRESS;
      requestUpdate();
    }
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchStartY = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (touchStartY == null) return;
    const currentY = event.touches[0]?.clientY;
    if (typeof currentY !== "number") return;

    const deltaY = touchStartY - currentY;
    if (Math.abs(deltaY) < 2) return;

    event.preventDefault();
    adjustProgress(deltaY * TOUCH_STEP);
    touchStartY = currentY;
  };

  const handleTouchEnd = () => {
    touchStartY = null;
  };

  const cleanup = () => {
    window.removeEventListener("wheel", handleWheel);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    window.removeEventListener("resize", requestUpdate);

    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }

    if ((window as typeof window & { [CLEANUP_KEY]?: () => void })[CLEANUP_KEY] === cleanup) {
      delete (window as typeof window & { [CLEANUP_KEY]?: () => void })[CLEANUP_KEY];
    }
  };

  (window as typeof window & { [CLEANUP_KEY]?: () => void })[CLEANUP_KEY] = cleanup;

  window.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd);
  window.addEventListener("resize", requestUpdate);
  document.addEventListener("astro:before-swap", cleanup, { once: true });
  document.addEventListener("swup:willReplaceContent", cleanup, { once: true });

  shell.setAttribute("data-home-mode", "timeline");
  applyProgress();
  return cleanup;
}
