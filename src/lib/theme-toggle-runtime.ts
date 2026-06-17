const GLOBAL_KEY = "__ThemeTogglerSingleton";
type ThemeName = "light" | "dark";
type TransitionMode = "expand" | "shrink" | "auto" | "reverse-auto";
type ViewTransitionLike = ReturnType<NonNullable<Document["startViewTransition"]>>;

declare global {
  interface Window {
    [GLOBAL_KEY]?: {
      init: () => void;
    };
  }
}

function bootstrapThemeToggleRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (window[GLOBAL_KEY]) {
    window[GLOBAL_KEY]?.init();
    return;
  }

  const ThemeToggler = (() => {
    const TRANSITION_MODES = {
      EXPAND: "expand",
      SHRINK: "shrink",
      AUTO: "auto",
      REVERSE_AUTO: "reverse-auto",
    } as const satisfies Record<string, TransitionMode>;

    const state = {
      currentTransition: null as ViewTransitionLike | null,
      timers: new Map<string, number>(),
      lastToggleTime: 0,
      listeners: [] as Array<{
        element: EventTarget;
        eventType: string;
        handler: EventListenerOrEventListenerObject;
        options?: AddEventListenerOptions | boolean;
      }>,
      boundButtons: new WeakSet<Element>(),
      rippleMap: new WeakMap<Element, HTMLElement>(),
      initialized: false,
      globalsBound: false,
    };

    const cache = {
      maskUrl: null as string | null,
      gradientOffset: 0.75,
      tempStyle: null as HTMLStyleElement | null,
    };

    const config = {
      duration: 700,
      buffer: 100,
      get totalTime() {
        return this.duration + this.buffer;
      },
      get cooldownTime() {
        return this.totalTime + 200;
      },
    };

    const initConfig = () => {
      const button = document.querySelector<HTMLElement>("#theme-toggle-button");
      if (!button?.dataset?.transitionDuration) return;

      const customDuration = parseInt(button.dataset.transitionDuration, 10);
      if (!Number.isNaN(customDuration)) {
        config.duration = customDuration;
      }
    };

    const getMaskUrl = () => {
      if (cache.maskUrl) return cache.maskUrl;
      const gradientOffset = cache.gradientOffset;
      const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><defs><radialGradient id="toggle-theme-gradient"><stop offset="${gradientOffset}"/><stop offset="1" stop-opacity="0"/></radialGradient></defs><circle cx="4" cy="4" r="4" fill="url(#toggle-theme-gradient)"/></svg>`;
      cache.maskUrl = `data:image/svg+xml;base64,${btoa(maskSvg)}`;
      return cache.maskUrl;
    };

    const getTempStyle = () => {
      let style = cache.tempStyle;
      if (!style || !style.isConnected) {
        style = document.getElementById(
          "theme-transition-temp-style",
        ) as HTMLStyleElement | null;
        if (!style) {
          style = document.createElement("style");
          style.id = "theme-transition-temp-style";
        }
        if (!style.parentNode) {
          document.head.appendChild(style);
        }
        cache.tempStyle = style;
      }
      return style;
    };

    const setTransitionFallbackSurface = () => {
      const transitionFallbackSurface =
        getComputedStyle(document.body).backgroundColor ||
        getComputedStyle(document.documentElement).backgroundColor;

      document.documentElement.style.setProperty(
        "--theme-transition-fallback-bg",
        transitionFallbackSurface,
      );
    };

    const clearTransitionFallbackSurface = () => {
      document.documentElement.style.removeProperty(
        "--theme-transition-fallback-bg",
      );
    };

    const timer = {
      set: (name: string, callback: () => void, delay: number) => {
        timer.clear(name);
        const id = window.setTimeout(callback, delay);
        state.timers.set(name, id);
        return id;
      },
      clear: (name: string) => {
        if (!state.timers.has(name)) return;
        window.clearTimeout(state.timers.get(name));
        state.timers.delete(name);
      },
      clearAll: () => {
        state.timers.forEach((id) => window.clearTimeout(id));
        state.timers.clear();
      },
    };

    const events = {
      add: (
        element: EventTarget | null | undefined,
        eventType: string,
        handler: EventListenerOrEventListenerObject,
        options?: AddEventListenerOptions | boolean,
      ) => {
        if (!element?.addEventListener) return null;
        element.addEventListener(eventType, handler, options);
        state.listeners.push({ element, eventType, handler, options });
        return handler;
      },
      removeAll: () => {
        state.listeners.forEach(({ element, eventType, handler, options }) => {
          try {
            element.removeEventListener(eventType, handler, options);
          } catch (error) {
            console.error("移除事件监听器出错:", error);
          }
        });
        state.listeners.length = 0;
      },
    };

    const buttonState = {
      setTransitioning: (button: Element | null, isTransitioning: boolean) => {
        if (button instanceof HTMLElement) {
          button.dataset.themeTransitioning = isTransitioning.toString();
        }
      },
      isTransitioning: (button: Element | null) => {
        return (
          button instanceof HTMLElement &&
          button.dataset.themeTransitioning === "true"
        );
      },
    };

    const theme = {
      getCurrent: (): ThemeName =>
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      getSystem: (): ThemeName =>
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
      getNext: (): ThemeName =>
        theme.getCurrent() === "light" ? "dark" : "light",
      set: (newTheme: ThemeName) => {
        document.documentElement.dataset.theme = newTheme;

        const systemTheme = theme.getSystem();
        if (newTheme === systemTheme) {
          localStorage.removeItem("theme");
        } else {
          localStorage.setItem("theme", newTheme);
        }

        window.dispatchEvent(
          new CustomEvent("theme:changed", {
            detail: { theme: newTheme },
          }),
        );
      },
      initialize: () => {
        const storedTheme = localStorage.getItem("theme");
        const systemTheme = theme.getSystem();

        if (storedTheme) {
          document.documentElement.dataset.theme = storedTheme;
        } else if (systemTheme) {
          document.documentElement.dataset.theme = systemTheme;
        } else {
          document.documentElement.dataset.theme = "light";
        }
      },
    };

    const timing = {
      canToggle: () =>
        Date.now() - state.lastToggleTime >= config.cooldownTime,
      recordToggle: () => {
        state.lastToggleTime = Date.now();
      },
    };

    const createRippleEffect = (x: number, y: number, element: Element) => {
      const container =
        element.querySelector<HTMLElement>("#ripple-container") ||
        (element instanceof HTMLElement ? element : null);
      if (!container) {
        return null;
      }

      let ripple = state.rippleMap.get(element);
      if (!ripple || ripple.parentNode !== container) {
        ripple =
          container.querySelector<HTMLElement>(".theme-ripple") ||
          document.createElement("span");
        ripple.classList.add("theme-ripple");
        if (!ripple.parentNode) {
          container.appendChild(ripple);
        }
        state.rippleMap.set(element, ripple);
      }

      const rect = (element as HTMLElement).getBoundingClientRect();
      ripple.style.left = `${x - rect.left}px`;
      ripple.style.top = `${y - rect.top}px`;
      ripple.style.animation = "none";
      void ripple.offsetWidth;
      ripple.style.animation = "";

      return ripple;
    };

    const determineAnimationType = (
      transitionMode: TransitionMode,
      fromTheme: ThemeName,
      toTheme: ThemeName,
    ): "expand" | "shrink" => {
      if (
        transitionMode === TRANSITION_MODES.EXPAND ||
        transitionMode === TRANSITION_MODES.SHRINK
      ) {
        return transitionMode;
      }

      if (transitionMode === TRANSITION_MODES.AUTO) {
        return fromTheme === "light" && toTheme === "dark"
          ? TRANSITION_MODES.EXPAND
          : TRANSITION_MODES.SHRINK;
      }

      if (transitionMode === TRANSITION_MODES.REVERSE_AUTO) {
        return fromTheme === "light" && toTheme === "dark"
          ? TRANSITION_MODES.SHRINK
          : TRANSITION_MODES.EXPAND;
      }

      return TRANSITION_MODES.EXPAND;
    };

    const createViewTransition = (
      callback: () => void,
      x: number,
      y: number,
      fromTheme: ThemeName,
      toTheme: ThemeName,
      transitionMode: TransitionMode,
    ) => {
      if (state.currentTransition) {
        try {
          state.currentTransition.skipTransition?.();
        } catch {
          // ignore
        } finally {
          state.currentTransition = null;
        }
      }

      if (!document.startViewTransition) {
        return Promise.resolve(callback());
      }

      try {
        document.documentElement.classList.remove("theme-transition-active");
        setTransitionFallbackSurface();

        const viewportWidth = Math.max(
          window.innerWidth,
          Math.ceil(window.visualViewport?.width || 0),
        );
        const viewportHeight = Math.max(
          window.innerHeight,
          Math.ceil(window.visualViewport?.height || 0),
        );
        const maxDistance = Math.max(
          Math.hypot(x, y),
          Math.hypot(viewportWidth - x, y),
          Math.hypot(x, viewportHeight - y),
          Math.hypot(viewportWidth - x, viewportHeight - y),
        );

        document.documentElement.style.setProperty(
          "--theme-ripple-color",
          toTheme === "dark" ? "230, 230, 230" : "20, 20, 20",
        );
        document.documentElement.classList.add("theme-transition-active");

        const animationType = determineAnimationType(
          transitionMode,
          fromTheme,
          toTheme,
        );

        const safeCallback = () => {
          try {
            callback();
          } catch (error) {
            console.error("主题切换回调执行出错:", error);
          }
        };

        const transition = document.startViewTransition(safeCallback);
        state.currentTransition = transition;

        const gradientOffset = cache.gradientOffset;
        const maskUrl = getMaskUrl();
        const viewportPadding = Math.max(
          96,
          Math.max(viewportWidth, viewportHeight) * 0.18,
        );
        const maxRadius = Math.ceil(
          (maxDistance + viewportPadding) / gradientOffset,
        );

        const createTransitionStyles = (options: {
          x: number;
          y: number;
          maxRadius: number;
          duration: number;
          isExpand: boolean;
          zIndex: number;
        }) => {
          const { x, y, maxRadius, duration, isExpand, zIndex } = options;
          const maskX = x;
          const maskY = y;

          const baseStyles = `
              animation: none !important;
              inset: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: none !important;
              max-height: none !important;
              -webkit-mask-image: url('${maskUrl}') !important;
              mask-image: url('${maskUrl}') !important;
              -webkit-mask-repeat: no-repeat !important;
              mask-repeat: no-repeat !important;
              z-index: ${zIndex} !important;
            `;

          const initialPosition = isExpand
            ? `${maskX}px ${maskY}px`
            : `${maskX - maxRadius}px ${maskY - maxRadius}px`;
          const initialSize = isExpand ? "0" : `${maxRadius * 2}px`;
          const finalPosition = isExpand
            ? `${maskX - maxRadius}px ${maskY - maxRadius}px`
            : `${maskX}px ${maskY}px`;
          const finalSize = isExpand ? `${maxRadius * 2}px` : "0";
          const timingFunction = isExpand
            ? "cubic-bezier(0.65, 0, 0.35, 1)"
            : "cubic-bezier(0.65, 0, 0.35, 1)";

          const initialStyle = `
              ${baseStyles}
              -webkit-mask-position: ${initialPosition} !important;
              mask-position: ${initialPosition} !important;
              -webkit-mask-size: ${initialSize} !important;
              mask-size: ${initialSize} !important;
            `;

          const finalStyle = `
              ${baseStyles}
              -webkit-mask-position: ${finalPosition} !important;
              mask-position: ${finalPosition} !important;
              -webkit-mask-size: ${finalSize} !important;
              mask-size: ${finalSize} !important;
              transition: -webkit-mask-position ${duration / 1000}s ${timingFunction},
                          -webkit-mask-size ${duration / 1000}s ${timingFunction},
                          mask-position ${duration / 1000}s ${timingFunction},
                          mask-size ${duration / 1000}s ${timingFunction} !important;
            `;

          return { initialStyle, finalStyle };
        };

        const style = getTempStyle();
        let styles: { initialStyle: string; finalStyle: string } | null = null;

        const applyInitialTransitionStyles = () => {
          if (animationType === TRANSITION_MODES.EXPAND) {
            styles = createTransitionStyles({
              x,
              y,
              maxRadius,
              duration: config.duration,
              isExpand: true,
              zIndex: 1000,
            });
            style.textContent = `::view-transition-new(root) { ${styles.initialStyle} }`;
            return;
          }

          styles = createTransitionStyles({
            x,
            y,
            maxRadius,
            duration: config.duration,
            isExpand: false,
            zIndex: 999,
          });
          style.textContent = `
              ::view-transition-old(root) { ${styles.initialStyle} }
              ::view-transition-new(root) { z-index: 998 !important; }
            `;
        };

        applyInitialTransitionStyles();

        (async function applyAnimation() {
          try {
            // 等待过渡准备完成
            await transition.ready;

            window
              .getComputedStyle(document.documentElement)
              .getPropertyValue("--force-reflow");

            requestAnimationFrame(() => {
              if (!style.parentNode || !styles) {
                return;
              }

              if (animationType === TRANSITION_MODES.EXPAND) {
                style.textContent = `::view-transition-new(root) { ${styles.finalStyle} }`;
                return;
              }

              style.textContent = `
                  ::view-transition-old(root) { ${styles.finalStyle} }
                  ::view-transition-new(root) { z-index: 998 !important; }
                `;
            });

            timer.set("cleanupStyle", () => {
              const tempStyle = document.getElementById(
                "theme-transition-temp-style",
              ) as HTMLStyleElement | null;
              if (tempStyle) {
                tempStyle.textContent = "";
              }
            }, config.totalTime);
          } catch (error) {
            if ((error as Error)?.name !== "AbortError") {
              console.error("应用主题过渡动画出错:", error);
              safeCallback();
            }
          }
        })();

        return transition.finished
          .then(() => {
            document.documentElement.classList.remove(
              "theme-transition-active",
            );
            clearTransitionFallbackSurface();
            state.currentTransition = null;
          })
          .catch((error) => {
            if ((error as Error)?.name !== "AbortError") {
              console.error("主题切换过渡动画错误:", error);
            }
            document.documentElement.classList.remove(
              "theme-transition-active",
            );
            clearTransitionFallbackSurface();
            state.currentTransition = null;
          });
      } catch (error) {
        console.error("主题切换错误:", error);
        document.documentElement.classList.remove("theme-transition-active");
        clearTransitionFallbackSurface();
        return Promise.resolve(callback());
      }
    };

    const cleanupResources = () => {
      if (state.currentTransition?.skipTransition) {
        try {
          state.currentTransition.skipTransition();
        } catch {
          // ignore
        } finally {
          state.currentTransition = null;
        }
      }

      timer.clearAll();

      const tempStyle = document.getElementById("theme-transition-temp-style");
      tempStyle?.remove();
      cache.tempStyle = null;

      document.documentElement.classList.remove("theme-transition-active");
      clearTransitionFallbackSurface();

      document.querySelectorAll(".theme-ripple").forEach((ripple) => {
        ripple.parentNode?.removeChild(ripple);
      });

      document.querySelectorAll("#theme-toggle-button").forEach((button) => {
        buttonState.setTransitioning(button, false);
      });

      events.removeAll();
      state.boundButtons = new WeakSet();
      state.rippleMap = new WeakMap();
      state.initialized = false;
      state.globalsBound = false;
    };

    const resetThemeToggleState = () => {
      timer.clearAll();
      state.lastToggleTime = 0;

      document.querySelectorAll("#theme-toggle-button").forEach((button) => {
        buttonState.setTransitioning(button, false);
      });

      document.querySelectorAll(".theme-ripple").forEach((ripple) => {
        ripple.parentNode?.removeChild(ripple);
      });
    };

    const bindGlobalListeners = () => {
      if (state.globalsBound) return;
      state.globalsBound = true;

      events.add(document, "astro:before-swap", resetThemeToggleState);
      events.add(document, "astro:after-swap", resetThemeToggleState);

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleMediaChange = (event: Event) => {
        const changeEvent = event as MediaQueryListEvent;
        if (!localStorage.getItem("theme")) {
          document.documentElement.dataset.theme = changeEvent.matches
            ? "dark"
            : "light";
        }
      };

      events.add(mediaQuery, "change", handleMediaChange);
      events.add(document, "astro:before-swap", cleanupResources, {
        once: true,
      });
      events.add(window, "beforeunload", cleanupResources, { once: true });
    };

    const handleThemeToggle = (event: Event, targetButton?: Element | null) => {
      event.preventDefault?.();
      event.stopPropagation?.();

      const button =
        targetButton ||
        ((event.target instanceof Element
          ? event.target.closest("#theme-toggle-button")
          : null) as Element | null);

      if (!button) return;
      if (
        !timing.canToggle() ||
        buttonState.isTransitioning(button) ||
        state.currentTransition
      ) {
        return;
      }

      timing.recordToggle();
      buttonState.setTransitioning(button, true);

      try {
        let clickX: number;
        let clickY: number;
        const pointerEvent = event as MouseEvent;

        if (
          typeof pointerEvent.clientX === "number" &&
          typeof pointerEvent.clientY === "number"
        ) {
          clickX = pointerEvent.clientX;
          clickY = pointerEvent.clientY;
        } else {
          const rect = (button as HTMLElement).getBoundingClientRect();
          clickX = rect.left + rect.width / 2;
          clickY = rect.top + rect.height / 2;
        }

        clickX = Number.isFinite(clickX) ? clickX : window.innerWidth / 2;
        clickY = Number.isFinite(clickY) ? clickY : window.innerHeight / 2;

        createRippleEffect(clickX, clickY, button);

        const currentTheme = theme.getCurrent();
        const newTheme = theme.getNext();
        let transitionMode: TransitionMode = TRANSITION_MODES.AUTO;

        if (button instanceof HTMLElement && button.dataset.transitionMode) {
          transitionMode = button.dataset.transitionMode as typeof transitionMode;
        }

        timer.clear("transition");

        const safeThemeChangeCallback = () => {
          try {
            theme.set(newTheme);
          } catch (error) {
            console.error("主题切换回调出错:", error);
          }
        };

        createViewTransition(
          safeThemeChangeCallback,
          clickX,
          clickY,
          currentTheme,
          newTheme,
          transitionMode,
        )
          .then(() => {
            timer.set("buttonReset", () => {
              buttonState.setTransitioning(button, false);
            }, config.buffer);
          })
          .catch((error) => {
            if ((error as Error)?.name !== "AbortError") {
              console.error("主题切换过渡动画错误:", error);
              safeThemeChangeCallback();
            }

            timer.set("buttonReset", () => {
              buttonState.setTransitioning(button, false);
            }, config.buffer);
          });

        timer.set("safetyReset", () => {
          buttonState.setTransitioning(button, false);
        }, config.totalTime + 200);
      } catch (error) {
        console.error("主题切换处理过程出错:", error);
        try {
          theme.set(theme.getNext());
        } catch (fallbackError) {
          console.error("主题切换降级处理失败:", fallbackError);
        }
        buttonState.setTransitioning(button, false);
      }
    };

    const bindButtons = () => {
      const themeToggleButtons = document.querySelectorAll("#theme-toggle-button");
      if (!themeToggleButtons.length) {
        return null;
      }

      themeToggleButtons.forEach((button) => {
        if (state.boundButtons.has(button)) return;
        state.boundButtons.add(button);

        buttonState.setTransitioning(button, false);
        events.add(button, "click", (event) => handleThemeToggle(event, button), {
          capture: true,
        });
        events.add(button, "keydown", (event) => {
          const keyboardEvent = event as KeyboardEvent;
          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
            keyboardEvent.preventDefault();
            handleThemeToggle(keyboardEvent, button);
          }
        });
      });

      return themeToggleButtons;
    };

    const init = () => {
      initConfig();
      bindGlobalListeners();

      const themeToggleButtons = bindButtons();
      if (!themeToggleButtons) return;

      if (!state.initialized) {
        theme.initialize();
        state.initialized = true;
      }
    };

    return { init };
  })();

  window[GLOBAL_KEY] = ThemeToggler;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ThemeToggler.init, {
      once: true,
    });
  } else {
    ThemeToggler.init();
  }
}

bootstrapThemeToggleRuntime();

export {};
