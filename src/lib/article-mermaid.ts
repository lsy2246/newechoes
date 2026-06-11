type MermaidModule = typeof import("mermaid");
type MermaidTheme = "dark" | "neutral";

declare global {
  interface Window {
    __articleMermaidCleanup?: () => void;
    __articleMermaidPromise?: Promise<MermaidModule["default"]>;
  }
}

const THEME_BY_MODE: Record<string, MermaidTheme> = {
  dark: "dark",
  light: "neutral",
};
const MERMAID_RENDER_ROOT_ID = "article-mermaid-render-root";
let mermaidRenderIdSequence = 0;

function getMermaidDiagrams() {
  return Array.from(document.querySelectorAll<HTMLPreElement>("pre.mermaid"));
}

function removeMermaidRenderArtifacts() {
  document
    .querySelectorAll("[id^='darticle-mermaid-'], [id^='iarticle-mermaid-']")
    .forEach((node) => {
      node.remove();
    });

  document.getElementById(MERMAID_RENDER_ROOT_ID)?.remove();
}

function getMermaidRenderRoot() {
  removeMermaidRenderArtifacts();

  const renderRoot = document.createElement("div");
  renderRoot.id = MERMAID_RENDER_ROOT_ID;
  renderRoot.setAttribute("data-article-mermaid-render-root", "true");
  renderRoot.setAttribute("aria-hidden", "true");
  renderRoot.style.cssText =
    "position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none;";

  document.body.appendChild(renderRoot);

  return renderRoot;
}

function getMermaidTheme() {
  const theme =
    document.documentElement.getAttribute("data-theme")
    || document.body?.getAttribute("data-theme")
    || "light";

  return THEME_BY_MODE[theme] || "neutral";
}

async function loadMermaid() {
  if (!window.__articleMermaidPromise) {
    window.__articleMermaidPromise = import("mermaid").then(
      ({ default: mermaid }) => mermaid,
    );
  }

  return window.__articleMermaidPromise;
}

function setDiagramState(diagram: HTMLPreElement, state: "loading" | "ready" | "error") {
  diagram.dataset.mermaidState = state;
}

function ensureDiagramSource(diagram: HTMLPreElement) {
  if (!diagram.dataset.diagram) {
    diagram.dataset.diagram = diagram.textContent || "";
  }

  return diagram.dataset.diagram || "";
}

function getNextMermaidRenderId(index: number) {
  mermaidRenderIdSequence += 1;

  return `article-mermaid-${index + 1}-${mermaidRenderIdSequence}`;
}

function renderError(diagram: HTMLPreElement, message: string) {
  const errorBox = document.createElement("div");
  errorBox.className = "mermaid-error";

  const title = document.createElement("strong");
  title.textContent = "Mermaid 渲染失败";

  const detail = document.createElement("span");
  detail.textContent = message;

  errorBox.append(title, detail);
  diagram.replaceChildren(errorBox);
  setDiagramState(diagram, "error");
}

export function initArticleMermaid() {
  if (typeof window === "undefined") {
    return;
  }

  window.__articleMermaidCleanup?.();

  let active = true;
  let themeTick = 0;

  const cleanup = () => {
    if (!active) return;
    active = false;

    if (themeTick) {
      window.clearTimeout(themeTick);
      themeTick = 0;
    }

    themeObserver.disconnect();
    document.removeEventListener("astro:before-swap", cleanup);
    document.removeEventListener("swup:visit:start", cleanup);
    window.removeEventListener("beforeunload", cleanup);

    if (window.__articleMermaidCleanup === cleanup) {
      delete window.__articleMermaidCleanup;
    }

    removeMermaidRenderArtifacts();
  };

  const renderDiagrams = async () => {
    const diagrams = getMermaidDiagrams();
    if (!active || diagrams.length === 0) {
      return;
    }

    diagrams.forEach((diagram) => {
      ensureDiagramSource(diagram);
      setDiagramState(diagram, "loading");
    });

    const mermaid = await loadMermaid();
    if (!active) {
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: getMermaidTheme(),
      gitGraph: {
        mainBranchName: "main",
        showCommitLabel: true,
        showBranches: true,
        rotateCommitLabel: true,
      },
    });

    for (const [index, diagram] of getMermaidDiagrams().entries()) {
      if (!active || !diagram.isConnected) {
        continue;
      }

      const definition = ensureDiagramSource(diagram);
      const id = getNextMermaidRenderId(index);
      const renderRoot = getMermaidRenderRoot();

      try {
        const { svg } = await mermaid.render(id, definition, renderRoot);
        if (!active || !diagram.isConnected) {
          continue;
        }

        diagram.innerHTML = svg;
        diagram.dataset.processed = "true";
        setDiagramState(diagram, "ready");
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Unknown mermaid error";
        renderError(diagram, message);
      } finally {
        removeMermaidRenderArtifacts();
      }
    }
  };

  const queueThemeRender = () => {
    if (!active) return;

    if (themeTick) {
      window.clearTimeout(themeTick);
    }

    themeTick = window.setTimeout(() => {
      themeTick = 0;
      void renderDiagrams();
    }, 16);
  };

  const themeObserver = new MutationObserver((mutations) => {
    if (
      mutations.some(
        (mutation) =>
          mutation.type === "attributes" && mutation.attributeName === "data-theme",
      )
    ) {
      queueThemeRender();
    }
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  if (document.body) {
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  document.addEventListener("astro:before-swap", cleanup, { once: true });
  document.addEventListener("swup:visit:start", cleanup, { once: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  window.__articleMermaidCleanup = cleanup;
  void renderDiagrams();
}
