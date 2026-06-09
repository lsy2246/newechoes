type GraphNode = {
  id: string;
  label: string;
  type: "root" | "section" | "article";
  route: string;
  sectionPath?: string;
  topSectionPath?: string;
};

type GraphLink = {
  source: string;
  target: string;
  kind: "structure" | "reference";
};

type SectionStructure = {
  name: string;
  path: string;
  articles: string[];
  sections: SectionStructure[];
};

type ArticleRecord = {
  id: string;
  identity: string;
  title: string;
  route: string;
};

type GlobalGraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
  structure: {
    articles: string[];
    sections: SectionStructure[];
  };
  articles: ArticleRecord[];
};

type GlobalGraphModalController = {
  open: () => Promise<void>;
  close: () => void;
};

const GLOBAL_GRAPH_DATA_URL = "/assets/index/global_graph.json";

let controllerPromise: Promise<GlobalGraphModalController | null> | null = null;
let graphDataPromise: Promise<GlobalGraphData> | null = null;

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function escapeJsonForScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function articleFallback(articleId: string): ArticleRecord {
  return {
    id: articleId,
    identity: articleId,
    title: articleId,
    route: `/articles/${encodeURI(articleId)}`,
  };
}

function sectionUrl(sectionPath: string) {
  return `/articles/${encodeURI(sectionPath)}`;
}

function renderDisclosureIcon() {
  return `
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m4 2 4 4-4 4"></path>
    </svg>
  `;
}

function renderCloseIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  `;
}

function renderArticle(articleId: string, articleMap: Map<string, ArticleRecord>, level: number) {
  const article = articleMap.get(articleId) ?? articleFallback(articleId);
  const title = escapeHtml(article.title);
  const route = escapeHtml(article.route);
  const nodeTarget = escapeHtml(`article:${article.identity}`);

  return `
    <li class="graph-tree-item graph-tree-item-article" data-article-id="${escapeHtml(article.id)}" style="--tree-level:${level};">
      <a href="${route}" class="graph-tree-link graph-tree-link-article" data-route-target="${route}" data-node-target="${nodeTarget}" data-astro-prefetch="hover">
        <span class="graph-tree-label">${title}</span>
      </a>
    </li>
  `;
}

function renderSection(section: SectionStructure, articleMap: Map<string, ArticleRecord>, level: number): string {
  const sectionPath = escapeHtml(section.path);
  const href = escapeHtml(sectionUrl(section.path));
  const childCount = section.articles.length + section.sections.length;
  const children = [
    ...section.sections.map((child) => renderSection(child, articleMap, level + 1)),
    ...section.articles.map((articleId) => renderArticle(articleId, articleMap, level + 1)),
  ].join("");
  const childMarkup = children
    ? `<ul class="graph-tree-children" hidden>${children}</ul>`
    : `<div class="graph-tree-empty" hidden>这个目录下暂时没有更多分支</div>`;

  return `
    <li class="graph-tree-item graph-tree-item-section" data-section-path="${sectionPath}" style="--tree-level:${level};">
      <div class="graph-tree-group" data-section-path="${sectionPath}" data-open="false">
        <button type="button" class="graph-tree-summary" aria-label="展开或折叠 ${escapeHtml(section.name)}" aria-expanded="false" data-tree-disclosure>
          <span class="graph-tree-disclosure" aria-hidden="true">${renderDisclosureIcon()}</span>
        </button>
        <a href="${href}" class="graph-tree-link graph-tree-link-section" data-route-target="${href}" data-section-path="${sectionPath}" data-node-target="section:${sectionPath}" data-astro-prefetch="hover">
          <span class="graph-tree-label">${escapeHtml(section.name)}</span>
        </a>
        <span class="graph-tree-count">${childCount}</span>
        ${childMarkup}
      </div>
    </li>
  `;
}

function renderGlobalGraphTree(data: GlobalGraphData) {
  const articleMap = new Map(data.articles.map((article) => [article.id, article]));
  const rootArticles = data.structure.articles.length
    ? `
      <li class="graph-tree-item graph-tree-item-top">
        <div class="graph-tree-top-label">根目录文章</div>
        <ul class="graph-tree-children">
          ${data.structure.articles.map((articleId) => renderArticle(articleId, articleMap, 0)).join("")}
        </ul>
      </li>
    `
    : "";

  return `
    <ul class="global-graph-tree">
      ${rootArticles}
      ${data.structure.sections.map((section) => renderSection(section, articleMap, 0)).join("")}
    </ul>
  `;
}

function renderGlobalGraphModal(data: GlobalGraphData) {
  const graphPayload = {
    nodes: data.nodes,
    links: data.links,
  };

  return `
    <div id="global-graph-modal" class="global-graph-modal hidden" aria-hidden="true">
      <script type="application/json" data-global-graph-json>${escapeJsonForScript(graphPayload)}</script>
      <div class="global-graph-backdrop" data-close-global-graph></div>

      <section class="global-graph-dialog" role="dialog" aria-modal="true" aria-labelledby="global-graph-title">
        <header class="global-graph-header">
          <div>
            <p class="global-graph-eyebrow">Site Index</p>
            <h2 id="global-graph-title">全站索引点群</h2>
            <p class="global-graph-subtitle">左边按文件树精确定位，右边用会轻微游动的点呈现文章关系。拖动节点时，相邻节点会被轻轻带动。</p>
          </div>
          <button type="button" class="global-graph-close" data-close-global-graph aria-label="关闭全局图谱">
            ${renderCloseIcon()}
          </button>
        </header>

        <div class="global-graph-body global-graph-body-split">
          <aside class="global-graph-tree-panel">
            <div class="global-graph-panel-header">
              <div>
                <h3>文字索引</h3>
              </div>
            </div>
            <div class="global-graph-tree-shell">
              ${renderGlobalGraphTree(data)}
            </div>
          </aside>

          <section class="global-graph-stage">
            <div class="global-graph-panel-header">
              <div>
                <h3>2D 点群</h3>
                <p>拖动画布浏览关系，拖动节点微调位置，点击节点进入文章。</p>
              </div>
              <span class="global-graph-drag-hint">Drag / Zoom</span>
            </div>

            <div class="global-graph-stage-canvas" data-graph-stage>
              <div class="global-graph-canvas" data-graph-canvas></div>
              <div class="global-graph-status" data-graph-status>
                <div class="global-graph-status__spinner" aria-hidden="true"></div>
                <p class="global-graph-status__text" data-global-graph-status-text>正在准备 2D 点群...</p>
              </div>
              <div class="global-graph-tooltip" data-graph-tooltip hidden></div>
            </div>
          </section>
        </div>
      </section>
    </div>
  `;
}

async function loadGlobalGraphData() {
  if (!graphDataPromise) {
    graphDataPromise = fetch(GLOBAL_GRAPH_DATA_URL, {
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch global graph data: ${response.status}`);
        }
        return response.json() as Promise<GlobalGraphData>;
      })
      .catch((error) => {
        graphDataPromise = null;
        throw error;
      });
  }

  return graphDataPromise;
}

async function ensureGraphModalMarkup() {
  const root = document.querySelector("[data-global-graph-root]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Global graph root not found");
  }

  if (root.querySelector("#global-graph-modal")) {
    return root;
  }

  root.innerHTML = renderGlobalGraphModal(await loadGlobalGraphData());
  return root;
}

async function ensureGlobalGraphController() {
  if (!controllerPromise) {
    controllerPromise = (async () => {
      await ensureGraphModalMarkup();
      const { initGlobalGraphModal } = await import("@/lib/global-graph/modal");
      return initGlobalGraphModal();
    })().catch((error) => {
      controllerPromise = null;
      throw error;
    });
  }

  return controllerPromise;
}

export async function openGlobalGraph() {
  const controller = await ensureGlobalGraphController();
  await controller?.open();
}

export async function preloadGlobalGraph() {
  await ensureGlobalGraphController();
  const { preloadGlobalGraphRuntime } = await import("@/lib/global-graph/modal");
  await preloadGlobalGraphRuntime();
}

export async function closeGlobalGraph() {
  const controller = await ensureGlobalGraphController();
  controller?.close();
}
