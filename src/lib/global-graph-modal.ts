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

type GraphPayload = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type RuntimeNode = GraphNode & {
  degree: number;
  neighbors: Set<string>;
  clusterKey: string;
  radius: number;
  labelElement: HTMLDivElement;
  anchorX: number;
  anchorY: number;
  depth: number;
  parentId: string | null;
  siblingIndex: number;
  siblingCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
};

type RuntimeLink = GraphLink & {
  source: RuntimeNode;
  target: RuntimeNode;
};

type ForceModule = {
  forceSimulation: (nodes: RuntimeNode[], dimensions?: number) => ForceSimulation;
  forceLink: (links: RuntimeLink[]) => ForceLink;
  forceManyBody: () => ForceManyBody;
  forceCollide: (radius: (node: RuntimeNode) => number) => ForceCollide;
  forceCenter: (x: number, y: number) => Force;
};

type Force = {
  initialize?: (nodes: RuntimeNode[]) => void;
  (alpha: number): void;
};

type ForceLink = Force & {
  id: (accessor: (node: RuntimeNode) => string) => ForceLink;
  distance: (accessor: (link: RuntimeLink) => number) => ForceLink;
  strength: (accessor: (link: RuntimeLink) => number) => ForceLink;
  iterations: (count: number) => ForceLink;
};

type ForceManyBody = Force & {
  strength: (accessor: (node: RuntimeNode) => number) => ForceManyBody;
  distanceMin: (value: number) => ForceManyBody;
  distanceMax: (value: number) => ForceManyBody;
};

type ForceCollide = Force & {
  strength: (value: number) => ForceCollide;
  iterations: (count: number) => ForceCollide;
};

type ForceSimulation = {
  alpha: (value: number) => ForceSimulation;
  alphaDecay: (value: number) => ForceSimulation;
  alphaMin: (value: number) => ForceSimulation;
  alphaTarget: (value: number) => ForceSimulation;
  velocityDecay: (value: number) => ForceSimulation;
  force: (name: string, force: Force | ForceLink | ForceManyBody | ForceCollide | null) => ForceSimulation;
  restart: () => ForceSimulation;
  stop: () => ForceSimulation;
  tick: (iterations?: number) => ForceSimulation;
};

type ThemePalette = {
  root: string;
  section: string;
  article: string;
  structure: string;
  structureActive: string;
  reference: string;
  text: string;
  textSoft: string;
  bg: string;
  labelBg: string;
};

type ViewState = {
  width: number;
  height: number;
  pixelRatio: number;
  zoom: number;
  viewOffset: {
    x: number;
    y: number;
  };
};

type GraphRuntime = {
  start: () => void;
  stop: () => void;
  resize: () => void;
  dispose: () => void;
  setCurrentNode: (nodeId: string, forceCenter?: boolean) => void;
  setHoverNode: (nodeId: string | null) => void;
  setPreviewNode: (nodeId: string | null) => void;
  updateTheme: () => void;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GRAPH_CLICK_THRESHOLD_PX = 3;
const GRAPH_DRAG_THRESHOLD_PX = 5;
const GRAPH_NODE_HIT_PADDING_PX = 12;
const GRAPH_CLUSTER_ROW_SPACING = 14;
const GRAPH_CLUSTER_CLOUD_JITTER = 58;
const GRAPH_LINK_CURVE = {
  structure: 10,
  reference: 24,
  current: 18,
} as const;
const GRAPH_LINK_ALPHA = {
  structure: 0.38,
  reference: 0.18,
  focusStructure: 0.9,
  focusReference: 0.82,
  current: 0.95,
} as const;
const GRAPH_LINK_WIDTH = {
  structure: 1.35,
  reference: 1.1,
  current: 2.15,
} as const;
const GRAPH_RECURSIVE_LAYOUT = {
  rootRadius: 116,
  branchDistance: 82,
  minBranchDistance: 46,
  depthFalloff: 0.86,
  childSpread: Math.PI * 0.72,
  articleSpread: Math.PI * 0.92,
  articleDistance: 54,
  siblingJitter: 16,
} as const;

function seededNoise(seed: number) {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function normalizeRoute(path: string) {
  if (!path) return "/";
  return path === "/" ? "/" : path.replace(/\/$/, "");
}

function getCurrentPath() {
  return normalizeRoute(window.location.pathname);
}

function getThemePalette(): ThemePalette {
  const styles = getComputedStyle(document.documentElement);
  const isDark =
    document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "dark";
  const read = (token: string, fallback: string) =>
    styles.getPropertyValue(token).trim() || fallback;

  return {
    root: read("--site-ink", isDark ? "#f5f7fa" : "#101010"),
    section: read("--site-ink", isDark ? "#f5f7fa" : "#101010"),
    article: read("--site-muted", isDark ? "#bdc5cf" : "#3f3f3f"),
    structure: isDark ? "rgba(143, 154, 167, 0.72)" : "rgba(16, 16, 16, 0.72)",
    structureActive: isDark ? "rgba(238, 242, 246, 0.9)" : "rgba(16, 16, 16, 0.9)",
    reference: isDark ? "rgba(170, 138, 255, 0.74)" : "rgba(116, 74, 196, 0.68)",
    text: read("--site-ink", isDark ? "#f5f7fa" : "#101010"),
    textSoft: read("--site-muted", isDark ? "#bdc5cf" : "#3f3f3f"),
    bg: read("--site-bg", isDark ? "#111315" : "#ffffff"),
    labelBg: isDark ? "rgba(17, 19, 21, 0.82)" : "rgba(255, 255, 255, 0.82)",
  };
}

function getClusterKey(node: GraphNode) {
  if (node.type === "root") return "__root__";
  return node.topSectionPath || node.sectionPath || node.id;
}

function getNodeRadius(node: GraphNode, degree = 0) {
  if (node.type === "root") return 7.8;
  if (node.type === "section") return Math.min(7.2, 4.8 + degree * 0.24);
  return Math.min(4.2, 2.6 + degree * 0.12);
}

function determineCurrentNode(
  nodes: GraphNode[],
  currentPath: string,
): {
  nodeId: string;
  label: string;
  route: string;
} {
  const normalizedPath = normalizeRoute(currentPath);
  let matchedArticle: GraphNode | null = null;
  let matchedSection: GraphNode | null = null;

  for (const node of nodes) {
    if (
      node.type === "article" &&
      normalizeRoute(node.route) === normalizedPath
    ) {
      matchedArticle = node;
      break;
    }
  }

  if (!matchedArticle) {
    for (const node of nodes) {
      if (node.type !== "section") continue;
      const sectionRoute = normalizeRoute(node.route);
      if (
        normalizedPath === sectionRoute ||
        normalizedPath.startsWith(`${sectionRoute}/`)
      ) {
        matchedSection = node;
      }
    }
  }

  return {
    nodeId: matchedArticle?.id || matchedSection?.id || "root",
    label: matchedArticle?.label || matchedSection?.label || "首页或非文章页面",
    route: matchedArticle?.route || matchedSection?.route || "/articles",
  };
}

function getNodeTargetByRoute(nodes: GraphNode[], route: string) {
  return determineCurrentNode(nodes, route);
}

function assignRecursiveLayoutMetadata(
  nodes: RuntimeNode[],
  links: RuntimeLink[],
) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<string, RuntimeNode[]>();

  nodes.forEach((node) => {
    node.depth = node.type === "root" ? 0 : 1;
    node.parentId = node.type === "root" ? null : "root";
    node.siblingIndex = 0;
    node.siblingCount = 1;
  });

  links.forEach((link) => {
    if (link.kind !== "structure") return;
    link.target.parentId = link.source.id;
    const children = childrenByParent.get(link.source.id) ?? [];
    children.push(link.target);
    childrenByParent.set(link.source.id, children);
  });

  const queue = [nodeMap.get("root")].filter(
    (node): node is RuntimeNode => Boolean(node),
  );

  while (queue.length > 0) {
    const parent = queue.shift();
    if (!parent) continue;
    const children = (childrenByParent.get(parent.id) ?? []).sort((left, right) => {
      if (left.type !== right.type) return left.type === "section" ? -1 : 1;
      return left.label.localeCompare(right.label, "zh-Hans-CN");
    });

    children.forEach((child, index) => {
      child.depth = parent.depth + 1;
      child.parentId = parent.id;
      child.siblingIndex = index;
      child.siblingCount = children.length;
      queue.push(child);
    });
  }

  return childrenByParent;
}

function getRecursiveBranchDistance(depth: number) {
  return Math.max(
    GRAPH_RECURSIVE_LAYOUT.minBranchDistance,
    GRAPH_RECURSIVE_LAYOUT.branchDistance *
      GRAPH_RECURSIVE_LAYOUT.depthFalloff ** Math.max(0, depth - 1),
  );
}

function createRecursiveAnchors(
  root: RuntimeNode | undefined,
  childrenByParent: Map<string, RuntimeNode[]>,
) {
  if (!root) return;

  root.anchorX = 0;
  root.anchorY = 0;
  root.x = 0;
  root.y = 0;
  root.vx = 0;
  root.vy = 0;

  const placeChildren = (parent: RuntimeNode, parentAngle: number) => {
    const children = childrenByParent.get(parent.id) ?? [];
    if (children.length === 0) return;

    const sectionCount = children.filter(
      (child) => child.type === "section",
    ).length;
    const spread =
      sectionCount > 0
        ? GRAPH_RECURSIVE_LAYOUT.childSpread
        : GRAPH_RECURSIVE_LAYOUT.articleSpread;
    const startAngle = parentAngle - spread / 2;
    const step = children.length > 1 ? spread / (children.length - 1) : 0;
    const distance =
      parent.depth === 0
        ? GRAPH_RECURSIVE_LAYOUT.rootRadius
        : getRecursiveBranchDistance(parent.depth + 1);

    children.forEach((child, index) => {
      const normalizedIndex = children.length > 1 ? index : 0.5;
      const childAngle =
        children.length > 1 ? startAngle + step * index : parentAngle;
      const cloudAngle =
        childAngle + (seededNoise(child.index ?? index) - 0.5) * 0.18;
      const articleOffset =
        child.type === "article"
          ? GRAPH_RECURSIVE_LAYOUT.articleDistance *
            Math.sqrt(normalizedIndex + 0.55) *
            0.28
          : 0;
      const siblingOffset =
        (child.siblingIndex - (child.siblingCount - 1) / 2) *
        (child.type === "article" ? 4.8 : 2.6);
      const jitter =
        (seededNoise((child.index ?? index) + 19.5) - 0.5) *
        GRAPH_RECURSIVE_LAYOUT.siblingJitter;
      const childDistance = distance + articleOffset + jitter;

      child.anchorX =
        (parent.anchorX ?? 0) +
        Math.cos(cloudAngle) * childDistance +
        Math.cos(cloudAngle + Math.PI / 2) * siblingOffset;
      child.anchorY =
        (parent.anchorY ?? 0) +
        Math.sin(cloudAngle) * childDistance +
        Math.sin(cloudAngle + Math.PI / 2) * siblingOffset;
      child.x =
        child.anchorX +
        (seededNoise((child.index ?? index) + 3.1) - 0.5) *
          GRAPH_CLUSTER_CLOUD_JITTER;
      child.y =
        child.anchorY +
        (seededNoise((child.index ?? index) + 4.6) - 0.5) *
          (GRAPH_CLUSTER_CLOUD_JITTER * 0.72);
      child.vx = 0;
      child.vy = 0;

      placeChildren(child, cloudAngle);
    });
  };

  placeChildren(root, -Math.PI / 2);
}

function seedForcePositions(
  nodes: RuntimeNode[],
  links: RuntimeLink[],
) {
  const childrenByParent = assignRecursiveLayoutMetadata(nodes, links);
  createRecursiveAnchors(
    nodes.find((node) => node.type === "root"),
    childrenByParent,
  );

  nodes.forEach((node) => {
    if (node.x != null && node.y != null) return;
    node.anchorX = 0;
    node.anchorY = 0;
    node.x = (seededNoise((node.index ?? 0) + 3.1) - 0.5) * GRAPH_CLUSTER_CLOUD_JITTER;
    node.y = (seededNoise((node.index ?? 0) + 4.6) - 0.5) * GRAPH_CLUSTER_CLOUD_JITTER;
    node.vx = 0;
    node.vy = 0;
  });
}

function getStructureLinkDistance(link: RuntimeLink) {
  const depthGap = Math.abs(link.source.depth - link.target.depth);
  const base = getRecursiveBranchDistance(
    Math.max(link.source.depth, link.target.depth),
  );
  const densityRelief = Math.min(26, Math.sqrt(link.target.siblingCount) * 5);

  if (link.target.type === "article") {
    return Math.max(40, base * 0.72 + densityRelief);
  }

  return Math.max(46, base * (0.9 + depthGap * 0.06) + densityRelief);
}

function createClusterForce(strength = 0.035): Force {
  let nodes: RuntimeNode[] = [];

  const force = (alpha: number) => {
    nodes.forEach((node) => {
      if (node.type === "root") return;
      const localStrength =
        strength *
        alpha *
        (node.type === "section" ? 1.06 : 0.68) *
        Math.max(0.62, 1 - node.depth * 0.035);
      node.vx = (node.vx ?? 0) + (node.anchorX - (node.x ?? 0)) * localStrength;
      node.vy = (node.vy ?? 0) + (node.anchorY - (node.y ?? 0)) * localStrength;
    });
  };

  force.initialize = (initializedNodes: RuntimeNode[]) => {
    nodes = initializedNodes;
  };

  return force;
}

function createAmbientDriftForce(
  getQuietNodeIds: () => Set<string>,
  strength = 0.0035,
): Force {
  let nodes: RuntimeNode[] = [];
  let frame = 0;

  const force = (alpha: number) => {
    frame += 1;
    const quietNodeIds = getQuietNodeIds();

    nodes.forEach((node, index) => {
      if (node.type === "root" || node.fx != null || node.fy != null) return;

      const seed = (node.index ?? index) + 1;
      const phase = frame * 0.018 + seededNoise(seed + 23.4) * Math.PI * 2;
      const quietFactor = quietNodeIds.has(node.id) ? 0.28 : 1;
      const typeFactor = node.type === "section" ? 0.62 : 1;
      const localStrength = strength * alpha * quietFactor * typeFactor;

      node.vx = (node.vx ?? 0) + Math.cos(phase) * localStrength;
      node.vy =
        (node.vy ?? 0) +
        Math.sin(phase * 0.83 + seededNoise(seed + 7.9)) * localStrength;
    });
  };

  force.initialize = (initializedNodes: RuntimeNode[]) => {
    nodes = initializedNodes;
  };

  return force;
}

function createRuntimeGraph(payload: GraphPayload) {
  const nodeMap = new Map<string, RuntimeNode>();
  const runtimeNodes = payload.nodes.map((node) => {
    const runtimeNode: RuntimeNode = {
      ...node,
      degree: 0,
      neighbors: new Set<string>(),
      clusterKey: getClusterKey(node),
      radius: getNodeRadius(node),
      labelElement: document.createElement("div"),
      anchorX: 0,
      anchorY: 0,
      depth: node.type === "root" ? 0 : 1,
      parentId: node.type === "root" ? null : "root",
      siblingIndex: 0,
      siblingCount: 1,
    };
    nodeMap.set(node.id, runtimeNode);
    return runtimeNode;
  });

  const runtimeLinks = payload.links
    .map((link) => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) return null;

      source.degree += 1;
      target.degree += 1;
      source.neighbors.add(target.id);
      target.neighbors.add(source.id);

      return {
        ...link,
        source,
        target,
      };
    })
    .filter(Boolean) as RuntimeLink[];

  runtimeNodes.forEach((node) => {
    node.radius = getNodeRadius(node, node.degree);
  });
  seedForcePositions(runtimeNodes, runtimeLinks);

  return {
    nodeMap,
    runtimeNodes,
    runtimeLinks,
    structureLinks: runtimeLinks.filter((link) => link.kind === "structure"),
    referenceLinks: runtimeLinks.filter((link) => link.kind === "reference"),
  };
}

function getFocusSets(
  focusNode: RuntimeNode | undefined,
  links: RuntimeLink[],
) {
  const focusSet = focusNode
    ? new Set([focusNode.id, ...focusNode.neighbors])
    : new Set<string>();
  const childLabelSet = new Set<string>();
  const relatedLabelSet = new Set<string>();

  if (focusNode && focusNode.type !== "article") {
    links.forEach((link) => {
      if (link.kind === "structure" && link.source.id === focusNode.id) {
        childLabelSet.add(link.target.id);
      }
    });
  }

  if (focusNode?.type === "article") {
    links.forEach((link) => {
      if (link.kind !== "reference") return;
      if (link.source.id === focusNode.id && link.target.type === "article") {
        relatedLabelSet.add(link.target.id);
      }
      if (link.target.id === focusNode.id && link.source.type === "article") {
        relatedLabelSet.add(link.source.id);
      }
    });
  }

  return {
    focusSet,
    childLabelSet,
    relatedLabelSet,
  };
}

async function createGraphRuntime(options: {
  stage: HTMLElement;
  mount: HTMLElement;
  tooltip: HTMLElement;
  status: HTMLElement | null;
  payload: GraphPayload;
  getCurrentNodeId: () => string;
  navigateTo: (route: string) => void;
}) {
  const forceModule = (await import("d3-force-3d")) as ForceModule;
  const palette = getThemePalette();
  const { stage, mount, tooltip, status, payload, getCurrentNodeId, navigateTo } =
    options;
  const { nodeMap, runtimeNodes, runtimeLinks, structureLinks, referenceLinks } =
    createRuntimeGraph(payload);
  const referencePairDirections = new Map<string, number>();

  referenceLinks.forEach((link, index) => {
    const pairKey = [link.source.id, link.target.id].sort().join("::");
    if (!referencePairDirections.has(pairKey)) {
      referencePairDirections.set(
        pairKey,
        seededNoise(index + link.source.id.length + link.target.id.length) > 0.5
          ? 1
          : -1,
      );
    }
  });

  const canvas = document.createElement("canvas");
  canvas.className = "global-graph-canvas-surface";
  canvas.setAttribute("aria-hidden", "true");
  mount.appendChild(canvas);

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("Canvas 2D context is unavailable.");
  }
  const ctx: CanvasRenderingContext2D = canvasContext;

  const labelLayer = document.createElement("div");
  labelLayer.className = "global-graph-label-layer";
  mount.appendChild(labelLayer);

  runtimeNodes.forEach((node) => {
    const label = document.createElement("div");
    label.className = `global-graph-label global-graph-label-${node.type}`;
    label.textContent = node.label;
    labelLayer.appendChild(label);
    node.labelElement = label;
  });

  let hoverNodeId: string | null = null;
  let previewNodeId: string | null = null;
  let currentNodeId = getCurrentNodeId();
  let animationId: number | null = null;
  let isRunning = false;
  let disposed = false;
  let dragNode: RuntimeNode | null = null;
  let pointerMode: "node" | "pan" | null = null;
  let pointerDownState: {
    x: number;
    y: number;
    originX: number;
    originY: number;
    worldX: number;
    worldY: number;
    nodeId: string | null;
    hasDragged: boolean;
    dragOffsetX: number;
    dragOffsetY: number;
  } | null = null;
  let lastPointer: { x: number; y: number; worldX: number; worldY: number } | null =
    null;

  const simulation = forceModule.forceSimulation(runtimeNodes, 2).stop();
  simulation
    .alpha(0.9)
    .alphaMin(0.001)
    .alphaDecay(0.028)
    .alphaTarget(0.012)
    .velocityDecay(0.32)
    .force(
      "link",
      forceModule
        .forceLink(structureLinks)
        .id((node: RuntimeNode) => node.id)
        .iterations(2)
        .distance((link: RuntimeLink) => getStructureLinkDistance(link))
        .strength((link: RuntimeLink) =>
          link.target.type === "article" ? 0.48 : 0.58,
        ),
    )
    .force(
      "charge",
      forceModule
        .forceManyBody()
        .strength((node: RuntimeNode) => {
          if (node.type === "root") return -420;
          if (node.type === "section") {
            return -150 - node.degree * 6 - node.siblingCount * 1.2;
          }
          return (
            -52 -
            node.degree * 1.8 -
            Math.min(28, node.siblingCount * 0.8)
          );
        })
        .distanceMin(14)
        .distanceMax(280),
    )
    .force(
      "collide",
      forceModule
        .forceCollide(
          (node: RuntimeNode) =>
            node.radius + 8 + Math.min(12, Math.sqrt(node.siblingCount) * 1.8),
        )
        .strength(0.86)
        .iterations(2),
    )
    .force("center", forceModule.forceCenter(0, 0))
    .force("cluster", createClusterForce(0.04))
    .force(
      "ambientDrift",
      createAmbientDriftForce(
        () =>
          new Set(
            [currentNodeId, hoverNodeId, previewNodeId].filter(
              (nodeId): nodeId is string => Boolean(nodeId),
            ),
          ),
      ),
    );

  simulation.tick(260);

  const view: ViewState = {
    width: 1,
    height: 1,
    pixelRatio: 1,
    zoom: 1,
    viewOffset: {
      x: 0,
      y: 0,
    },
  };

  function getFocusNodeId() {
    return previewNodeId || hoverNodeId || currentNodeId || "root";
  }

  function worldToScreen(x = 0, y = 0) {
    return {
      x: view.width / 2 + view.viewOffset.x + x * view.zoom,
      y: view.height / 2 + view.viewOffset.y + y * view.zoom,
    };
  }

  function screenToWorld(x: number, y: number) {
    return {
      x: (x - view.width / 2 - view.viewOffset.x) / view.zoom,
      y: (y - view.height / 2 - view.viewOffset.y) / view.zoom,
    };
  }

  function getPointer(event: PointerEvent | WheelEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const world = screenToWorld(x, y);
    return {
      x,
      y,
      worldX: world.x,
      worldY: world.y,
    };
  }

  function getNodeAtPoint(x: number, y: number): RuntimeNode | null {
    let bestNode: RuntimeNode | null = null;
    let bestDistance = Infinity;

    for (const node of runtimeNodes) {
      const point = worldToScreen(node.x, node.y);
      const radius = Math.max(12, node.radius * view.zoom + GRAPH_NODE_HIT_PADDING_PX);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= radius && distance < bestDistance) {
        bestNode = node;
        bestDistance = distance;
      }
    }

    return bestNode;
  }

  function centerOnNode(nodeId: string, force = false) {
    const node = nodeMap.get(nodeId) ?? nodeMap.get("root");
    if (!node) return;

    const targetX = -(node.x ?? 0) * view.zoom;
    const targetY = -(node.y ?? 0) * view.zoom;
    if (force) {
      view.viewOffset.x = targetX;
      view.viewOffset.y = targetY;
    } else {
      view.viewOffset.x += (targetX - view.viewOffset.x) * 0.42;
      view.viewOffset.y += (targetY - view.viewOffset.y) * 0.42;
    }
  }

  function fitGraph() {
    const visibleNodes = runtimeNodes.filter((node) => node.type !== "root");
    const nodes = visibleNodes.length > 0 ? visibleNodes : runtimeNodes;
    const minX = Math.min(...nodes.map((node) => node.x ?? 0));
    const maxX = Math.max(...nodes.map((node) => node.x ?? 0));
    const minY = Math.min(...nodes.map((node) => node.y ?? 0));
    const maxY = Math.max(...nodes.map((node) => node.y ?? 0));
    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const fitZoom = Math.min(
      view.width / (graphWidth + 170),
      view.height / (graphHeight + 140),
    );
    view.zoom = Math.min(1.32, Math.max(0.72, fitZoom));
    view.viewOffset.x = -((minX + maxX) / 2) * view.zoom;
    view.viewOffset.y = -((minY + maxY) / 2) * view.zoom;
  }

  function setCanvasSize() {
    view.width = Math.max(stage.clientWidth, 1);
    view.height = Math.max(stage.clientHeight, 1);
    view.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.width * view.pixelRatio);
    canvas.height = Math.round(view.height * view.pixelRatio);
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;
    ctx.setTransform(view.pixelRatio, 0, 0, view.pixelRatio, 0, 0);
  }

  function getLinkCurve(link: RuntimeLink, isCurrent = false) {
    if (isCurrent) return GRAPH_LINK_CURVE.current;
    return link.kind === "reference"
      ? GRAPH_LINK_CURVE.reference
      : GRAPH_LINK_CURVE.structure;
  }

  function getLinkControlPoint(
    source: { x: number; y: number },
    target: { x: number; y: number },
    curve: number,
    seed: number,
    directionOverride?: number,
  ) {
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const direction = directionOverride ?? (seededNoise(seed + 31.4) > 0.5 ? 1 : -1);

    return {
      x: midX + (-dy / length) * curve * direction,
      y: midY + (dx / length) * curve * direction,
    };
  }

  function getReferencePairDirection(link: RuntimeLink) {
    if (link.kind === "reference") {
      const pairKey = [link.source.id, link.target.id].sort().join("::");
      const pairDirection = referencePairDirections.get(pairKey) ?? 1;
      return link.source.id <= link.target.id ? pairDirection : -pairDirection;
    }

    return 1;
  }

  function drawLinks(focusSet: Set<string>) {
    structureLinks.forEach((link) => {
      const source = worldToScreen(link.source.x, link.source.y);
      const target = worldToScreen(link.target.x, link.target.y);
      const isFocused = focusSet.has(link.source.id) && focusSet.has(link.target.id);
      const isCurrent =
        link.source.id === currentNodeId || link.target.id === currentNodeId;
      const zoomLineScale = Math.max(1, Math.sqrt(view.zoom));

      ctx.save();
      ctx.strokeStyle =
        isCurrent || isFocused
          ? palette.structureActive
          : link.kind === "reference"
            ? palette.reference
            : palette.structure;
      ctx.globalAlpha =
        isCurrent
          ? GRAPH_LINK_ALPHA.current
          : link.kind === "reference"
            ? isFocused
              ? GRAPH_LINK_ALPHA.focusReference
              : GRAPH_LINK_ALPHA.reference
            : isFocused
              ? GRAPH_LINK_ALPHA.focusStructure
              : GRAPH_LINK_ALPHA.structure;
      ctx.lineWidth =
        (isCurrent
          ? GRAPH_LINK_WIDTH.current
          : link.kind === "reference"
            ? GRAPH_LINK_WIDTH.reference
            : GRAPH_LINK_WIDTH.structure) * zoomLineScale;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      const curve = getLinkCurve(link, isCurrent);
      const control = getLinkControlPoint(source, target, curve, link.target.index ?? 0);
      ctx.quadraticCurveTo(control.x, control.y, target.x, target.y);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawReferenceLinks(focusSet: Set<string>) {
    referenceLinks.forEach((link) => {
      const source = worldToScreen(link.source.x, link.source.y);
      const target = worldToScreen(link.target.x, link.target.y);
      const isFocused = focusSet.has(link.source.id) && focusSet.has(link.target.id);
      const isCurrent =
        link.source.id === currentNodeId || link.target.id === currentNodeId;

      const zoomLineScale = Math.max(1, Math.sqrt(view.zoom));

      ctx.save();
      ctx.strokeStyle = palette.reference;
      ctx.globalAlpha = isCurrent ? GRAPH_LINK_ALPHA.focusReference : isFocused ? GRAPH_LINK_ALPHA.focusReference : GRAPH_LINK_ALPHA.reference;
      ctx.lineWidth =
        (isCurrent ? GRAPH_LINK_WIDTH.current : GRAPH_LINK_WIDTH.reference) *
        zoomLineScale;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      const curve = getLinkCurve(link, isCurrent);
      const control = getLinkControlPoint(
        source,
        target,
        curve,
        link.target.index ?? 0,
        getReferencePairDirection(link),
      );
      ctx.quadraticCurveTo(control.x, control.y, target.x, target.y);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawNodes(focusSet: Set<string>) {
    runtimeNodes.forEach((node) => {
      const point = worldToScreen(node.x, node.y);
      const isCurrent = node.id === currentNodeId;
      const isInteractive = node.id === hoverNodeId || node.id === previewNodeId;
      const isFocusMember = focusSet.has(node.id);
      const baseRadius = node.radius * view.zoom;
      const radius =
        baseRadius *
        (isCurrent ? 1.7 : isInteractive ? 1.42 : node.type === "root" ? 1.18 : 1);

      ctx.save();
      if (isCurrent || isInteractive) {
        ctx.strokeStyle = palette.structureActive;
        ctx.globalAlpha = isCurrent ? 0.46 : 0.28;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha =
        isCurrent || isInteractive || isFocusMember
          ? 1
          : node.type === "article"
            ? 0.46
            : 0.72;
      ctx.fillStyle =
        node.type === "article"
          ? palette.article
          : node.type === "section"
            ? palette.section
            : palette.root;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(1.8, radius), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function updateLabels(
    focusNode: RuntimeNode | undefined,
    childLabelSet: Set<string>,
    relatedLabelSet: Set<string>,
    focusSet: Set<string>,
  ) {
    runtimeNodes.forEach((node) => {
      const point = worldToScreen(node.x, node.y);
      const isCurrent = node.id === currentNodeId;
      const isHover = node.id === hoverNodeId || node.id === previewNodeId;
      const showLabel =
        isCurrent ||
        isHover ||
        node.type === "root" ||
        childLabelSet.has(node.id) ||
        relatedLabelSet.has(node.id) ||
        (focusSet.has(node.id) && node.type === "section" && focusNode?.type !== "root");

      node.labelElement.classList.toggle("is-visible", showLabel);
      node.labelElement.classList.toggle("is-current", isCurrent);
      node.labelElement.classList.toggle("is-hover", isHover);
      node.labelElement.classList.toggle(
        "is-child",
        childLabelSet.has(node.id) && !isCurrent && !isHover,
      );
      node.labelElement.classList.toggle(
        "is-related",
        relatedLabelSet.has(node.id) && !isCurrent && !isHover,
      );
      node.labelElement.style.transform = `translate(${point.x}px, ${point.y - node.radius * view.zoom - 12}px) translate(-50%, -100%)`;
    });
  }

  function updateTooltip() {
    const node = hoverNodeId ? nodeMap.get(hoverNodeId) : null;
    if (!node || !lastPointer) {
      tooltip.hidden = true;
      return;
    }

    tooltip.hidden = false;
    tooltip.textContent = node.label;
    tooltip.style.transform = `translate(${lastPointer.x + 14}px, ${lastPointer.y + 14}px)`;
  }

  function render() {
    const focusNode = nodeMap.get(getFocusNodeId()) ?? nodeMap.get("root");
    const { focusSet, childLabelSet, relatedLabelSet } = getFocusSets(
      focusNode,
      runtimeLinks,
    );

    ctx.clearRect(0, 0, view.width, view.height);
    drawLinks(focusSet);
    drawReferenceLinks(focusSet);
    drawNodes(focusSet);
    updateLabels(focusNode, childLabelSet, relatedLabelSet, focusSet);
    updateTooltip();
  }

  function setHoverNode(nodeId: string | null) {
    hoverNodeId = nodeId;
    render();
  }

  function setPreviewNode(nodeId: string | null) {
    previewNodeId = nodeId;
    render();
  }

  function resize() {
    const previousWidth = view.width;
    const previousHeight = view.height;
    setCanvasSize();
    if (previousWidth <= 1 || previousHeight <= 1) {
      fitGraph();
    }
    render();
  }

  function updateTheme() {
    Object.assign(palette, getThemePalette());
    render();
  }

  function loop() {
    if (!isRunning || disposed) return;
    simulation.tick(1);
    render();
    animationId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (isRunning || disposed) return;
    isRunning = true;
    mount.classList.add("is-ready");
    stage.classList.add("is-ready");
    if (status) status.hidden = true;
    resize();
    simulation.alphaTarget(0.012).restart();
    loop();
  }

  function stop() {
    isRunning = false;
    simulation.stop();
    if (animationId != null) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    canvas.remove();
    labelLayer.remove();
  }

  canvas.addEventListener(
    "pointermove",
    (event) => {
      const pointer = getPointer(event);
      const node = getNodeAtPoint(pointer.x, pointer.y);
      lastPointer = pointer;

      if (dragNode && pointerDownState) {
        const totalDistance = Math.hypot(
          pointer.x - pointerDownState.originX,
          pointer.y - pointerDownState.originY,
        );
        if (totalDistance >= GRAPH_DRAG_THRESHOLD_PX) {
          pointerDownState.hasDragged = true;
        }

        const dx = pointer.worldX - pointerDownState.worldX;
        const dy = pointer.worldY - pointerDownState.worldY;
        dragNode.fx = pointer.worldX - pointerDownState.dragOffsetX;
        dragNode.fy = pointer.worldY - pointerDownState.dragOffsetY;

        runtimeNodes.forEach((candidate) => {
          if (candidate.id === dragNode?.id) return;
          const sameCluster = candidate.clusterKey === dragNode?.clusterKey;
          const neighbor = dragNode?.neighbors.has(candidate.id);
          if (!sameCluster && !neighbor) return;
          const pull = neighbor ? 0.18 : 0.045;
          candidate.vx = (candidate.vx ?? 0) + dx * pull;
          candidate.vy = (candidate.vy ?? 0) + dy * pull;
        });

        pointerDownState.worldX = pointer.worldX;
        pointerDownState.worldY = pointer.worldY;
        simulation.alpha(0.22).restart();
        render();
        return;
      }

      if (pointerMode === "pan" && pointerDownState) {
        view.viewOffset.x += pointer.x - pointerDownState.x;
        view.viewOffset.y += pointer.y - pointerDownState.y;
        pointerDownState.x = pointer.x;
        pointerDownState.y = pointer.y;
        render();
        return;
      }

      canvas.style.cursor = node ? "pointer" : "grab";
      setHoverNode(node?.id ?? null);
    },
    { passive: true },
  );

  canvas.addEventListener(
    "pointerleave",
    () => {
      if (!dragNode && pointerMode !== "pan") {
        canvas.style.cursor = "grab";
        setHoverNode(null);
      }
      tooltip.hidden = true;
    },
    { passive: true },
  );

  canvas.addEventListener("pointerdown", (event) => {
    const pointer = getPointer(event);
    const node = getNodeAtPoint(pointer.x, pointer.y);
    pointerDownState = {
      ...pointer,
      originX: pointer.x,
      originY: pointer.y,
      nodeId: node?.id ?? null,
      hasDragged: false,
      dragOffsetX: node ? pointer.worldX - (node.x ?? pointer.worldX) : 0,
      dragOffsetY: node ? pointer.worldY - (node.y ?? pointer.worldY) : 0,
    };
    lastPointer = pointer;
    pointerMode = node ? "node" : "pan";
    dragNode = node;
    mount.classList.add("is-dragging");
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);

    if (dragNode) {
      dragNode.fx = dragNode.x ?? pointer.worldX;
      dragNode.fy = dragNode.y ?? pointer.worldY;
      simulation.alphaTarget(0.18).restart();
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    const pointer = getPointer(event);
    const node = getNodeAtPoint(pointer.x, pointer.y);
    const movedDistance = pointerDownState
      ? Math.hypot(
          pointer.x - pointerDownState.originX,
          pointer.y - pointerDownState.originY,
        )
      : Infinity;

    if (
      pointerDownState &&
      !pointerDownState.hasDragged &&
      movedDistance <= GRAPH_CLICK_THRESHOLD_PX &&
      pointerDownState.nodeId &&
      pointerDownState.nodeId === node?.id
    ) {
      navigateTo(node.route);
    }

    if (dragNode) {
      dragNode.fx = null;
      dragNode.fy = null;
    }

    dragNode = null;
    pointerMode = null;
    pointerDownState = null;
    mount.classList.remove("is-dragging");
    canvas.style.cursor = node ? "pointer" : "grab";
    simulation.alphaTarget(0.012).restart();

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const pointer = getPointer(event);
      const before = screenToWorld(pointer.x, pointer.y);
      const zoomDelta = Math.exp(-event.deltaY * 0.0012);
      view.zoom = Math.min(2.6, Math.max(0.46, view.zoom * zoomDelta));
      const after = screenToWorld(pointer.x, pointer.y);
      view.viewOffset.x += (after.x - before.x) * view.zoom;
      view.viewOffset.y += (after.y - before.y) * view.zoom;
      render();
    },
    { passive: false },
  );

  currentNodeId = getCurrentNodeId();
  resize();
  centerOnNode(currentNodeId, true);
  render();

  return {
    start,
    stop,
    resize,
    dispose,
    setCurrentNode(nodeId: string, forceCenter = false) {
      currentNodeId = nodeId || "root";
      centerOnNode(currentNodeId, forceCenter);
      render();
    },
    setHoverNode,
    setPreviewNode,
    updateTheme,
  } satisfies GraphRuntime;
}

export function initGlobalGraphModal() {
  const modal = document.getElementById("global-graph-modal");
  if (!(modal instanceof HTMLElement) || modal.dataset.graphBound === "true") {
    return;
  }

  const modalEl = modal;
  modalEl.dataset.graphBound = "true";

  const stage = modalEl.querySelector("[data-graph-stage]");
  const mount = modalEl.querySelector("[data-graph-canvas]");
  const tooltip = modalEl.querySelector("[data-graph-tooltip]");
  const status = modalEl.querySelector("[data-graph-status]");
  const dataElement = modalEl.querySelector("[data-global-graph-json]");

  if (
    !(stage instanceof HTMLElement) ||
    !(mount instanceof HTMLElement) ||
    !(tooltip instanceof HTMLElement) ||
    !(dataElement instanceof HTMLScriptElement)
  ) {
    return;
  }

  const stageEl = stage;
  const mountEl = mount;
  const tooltipEl = tooltip;
  const statusEl = status instanceof HTMLElement ? status : null;

  const payload = JSON.parse(
    dataElement.textContent || '{"nodes":[],"links":[]}',
  ) as GraphPayload;

  const activeListeners: Array<{
    element: EventTarget;
    eventType: string;
    handler: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];
  const cleanupListeners: Array<{
    element: EventTarget;
    eventType: string;
    handler: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];

  let isOpen = false;
  let currentNodeId = "root";
  let graphRuntime: GraphRuntime | null = null;
  let graphRuntimePromise: Promise<GraphRuntime> | null = null;
  let pendingRoute: string | null = null;

  function addListener(
    element: EventTarget | null,
    eventType: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!element) return;
    element.addEventListener(eventType, handler, options);
    activeListeners.push({ element, eventType, handler, options });
  }

  function syncButtons(expanded: boolean) {
    document.querySelectorAll("[data-open-global-graph]").forEach((button) => {
      if (button instanceof HTMLElement) {
        button.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
    });
  }

  function getCurrentNodeId() {
    return currentNodeId;
  }

  function closeModal() {
    modalEl.classList.add("hidden");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("global-graph-open");
    syncButtons(false);
    isOpen = false;
    tooltipEl.hidden = true;
    graphRuntime?.stop();
  }

  function syncTreeCurrentItem(nodeId: string) {
    modalEl.querySelectorAll(".graph-tree-link").forEach((link) => {
      if (!(link instanceof HTMLElement)) return;
      const linkNodeId = link.getAttribute("data-node-target") || "";
      link.classList.toggle("is-current", linkNodeId === nodeId);
    });
  }

  function syncTreeOpenState(nodeId: string) {
    const node = payload.nodes.find((candidate) => candidate.id === nodeId);
    const openSectionPaths = new Set<string>();
    const sectionPath =
      node?.type === "section" ? node.sectionPath || "" : node?.sectionPath || "";

    if (sectionPath) {
      const segments = sectionPath.split("/").filter(Boolean);
      segments.forEach((_, index) => {
        openSectionPaths.add(segments.slice(0, index + 1).join("/"));
      });
    }

    modalEl.querySelectorAll(".graph-tree-group").forEach((group) => {
      if (!(group instanceof HTMLElement)) return;
      const sectionPath = group.getAttribute("data-section-path") || "";
      const isOpen = openSectionPaths.has(sectionPath);
      const disclosure = group.querySelector("[data-tree-disclosure]");
      const children = group.querySelector(".graph-tree-children, .graph-tree-empty");

      group.classList.toggle("is-open", isOpen);
      group.setAttribute("data-open", isOpen ? "true" : "false");
      if (disclosure instanceof HTMLElement) {
        disclosure.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
      if (children instanceof HTMLElement) {
        children.hidden = !isOpen;
      }
    });
  }

  function centerTreeOnCurrentItem() {
    const treeShell = modalEl.querySelector(".global-graph-tree-shell");
    const currentLink = modalEl.querySelector(".graph-tree-link.is-current");
    if (!(treeShell instanceof HTMLElement) || !(currentLink instanceof HTMLElement)) {
      return;
    }

    const shellRect = treeShell.getBoundingClientRect();
    const currentRect = currentLink.getBoundingClientRect();
    const nextTop =
      treeShell.scrollTop +
      (currentRect.top - shellRect.top) -
      shellRect.height / 2 +
      currentRect.height / 2;

    treeShell.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
  }

  function applyCurrentInfo(info: ReturnType<typeof determineCurrentNode>) {
    currentNodeId = info.nodeId;

    syncTreeOpenState(currentNodeId);
    syncTreeCurrentItem(currentNodeId);
    centerTreeOnCurrentItem();
    graphRuntime?.setCurrentNode(currentNodeId, true);
  }

  function navigateTo(route: string, options?: { closeModal?: boolean }) {
    if (!route) return;
    const normalizedRoute = normalizeRoute(route);
    pendingRoute = normalizedRoute;

    if (options?.closeModal) {
      closeModal();
    } else {
      applyCurrentInfo(getNodeTargetByRoute(payload.nodes, normalizedRoute));
      if (isOpen) {
        graphRuntime?.resize();
      }
    }

    const swup = (
      window as Window & {
        swup?: { navigate?: (nextRoute: string) => void };
      }
    ).swup;

    if (swup?.navigate) {
      swup.navigate(route);
      return;
    }

    window.location.assign(route);
  }

  function syncCurrentLocation() {
    const currentPath = pendingRoute ?? getCurrentPath();
    const currentInfo = determineCurrentNode(payload.nodes, currentPath);
    applyCurrentInfo(currentInfo);
  }

  async function ensureGraphRuntime() {
    if (graphRuntime) return graphRuntime;
    if (graphRuntimePromise) return graphRuntimePromise;

    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "正在加载 2D 点群图谱...";
    }

    graphRuntimePromise = createGraphRuntime({
      stage: stageEl,
      mount: mountEl,
      tooltip: tooltipEl,
      status: statusEl,
      payload,
      getCurrentNodeId,
      navigateTo,
    })
      .then((runtime) => {
        graphRuntime = runtime;
        runtime.setCurrentNode(currentNodeId, true);
        return runtime;
      })
      .catch((error) => {
        console.error("2D 图谱加载失败:", error);
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = "2D 图谱初始化失败，请稍后刷新重试。";
        }
        graphRuntimePromise = null;
        throw error;
      });

    return graphRuntimePromise;
  }

  async function openModal() {
    modalEl.classList.remove("hidden");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("global-graph-open");
    syncButtons(true);
    isOpen = true;

    syncCurrentLocation();

    try {
      const runtime = await ensureGraphRuntime();
      runtime.resize();
      runtime.setCurrentNode(currentNodeId, true);
      runtime.start();
    } catch {
      return;
    }
  }

  function syncAfterNavigation() {
    pendingRoute = null;
    syncCurrentLocation();
    if (!isOpen) return;
    graphRuntime?.resize();
    graphRuntime?.setCurrentNode(currentNodeId, true);
  }

  const onKeydown: EventListener = (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key === "Escape" && isOpen) {
      closeModal();
    }
  };

  const themeObserver = new MutationObserver(() => {
    graphRuntime?.updateTheme();
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });

  document.querySelectorAll("[data-open-global-graph]").forEach((button) => {
    addListener(button, "click", openModal);
  });

  modalEl.querySelectorAll("[data-close-global-graph]").forEach((element) => {
    addListener(element, "click", closeModal);
  });

  modalEl.querySelectorAll("[data-tree-disclosure]").forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    const group = button.closest(".graph-tree-group");
    const children = group?.querySelector(".graph-tree-children, .graph-tree-empty");
    if (!(group instanceof HTMLElement)) return;

    addListener(button, "click", () => {
      const isOpen = group.getAttribute("data-open") !== "true";
      group.classList.toggle("is-open", isOpen);
      group.setAttribute("data-open", isOpen ? "true" : "false");
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (children instanceof HTMLElement) {
        children.hidden = !isOpen;
      }
    });
  });

  modalEl.querySelectorAll(".graph-tree-link").forEach((link) => {
    if (!(link instanceof HTMLElement)) return;
    const nodeId = link.getAttribute("data-node-target");
    const route = link.getAttribute("data-route-target") || link.getAttribute("href");
    if (!nodeId) return;

    addListener(link, "mouseenter", () => {
      graphRuntime?.setPreviewNode(nodeId);
    });
    addListener(link, "mouseleave", () => {
      graphRuntime?.setPreviewNode(null);
    });
    addListener(link, "focus", () => {
      graphRuntime?.setPreviewNode(nodeId);
    });
    addListener(link, "blur", () => {
      graphRuntime?.setPreviewNode(null);
    });
    addListener(link, "click", (event) => {
      if (!route) return;
      event.preventDefault();
      navigateTo(route);
    });
  });

  addListener(document, "keydown", onKeydown);
  addListener(window, "resize", () => {
    if (!isOpen) return;
    graphRuntime?.resize();
  });
  addListener(document, "astro:after-swap", syncAfterNavigation);
  addListener(document, "astro:page-load", syncAfterNavigation);
  addListener(document, "swup:content:replace", syncAfterNavigation);
  addListener(document, "swup:page:view", syncAfterNavigation);
  addListener(window, "popstate", syncAfterNavigation);

  const cleanup = () => {
    activeListeners.forEach(({ element, eventType, handler, options }) => {
      element.removeEventListener(eventType, handler, options);
    });
    activeListeners.length = 0;

    cleanupListeners.forEach(({ element, eventType, handler, options }) => {
      element.removeEventListener(eventType, handler, options);
    });
    cleanupListeners.length = 0;

    themeObserver.disconnect();
    graphRuntime?.dispose();
    graphRuntime = null;
    graphRuntimePromise = null;
    modalEl.dataset.graphBound = "false";
    document.body.classList.remove("global-graph-open");
  };

  [
    { element: document, eventType: "astro:before-swap", options: { once: true } },
    { element: window, eventType: "beforeunload", options: { once: true } },
  ].forEach(({ element, eventType, options }) => {
    element.addEventListener(eventType, cleanup, options);
    cleanupListeners.push({
      element,
      eventType,
      handler: cleanup,
      options,
    });
  });

  syncCurrentLocation();
}
