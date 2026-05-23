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
    root: read("--site-ink", isDark ? "#aaa5aa" : "#050505"),
    section: read("--site-ink", isDark ? "#aaa5aa" : "#050505"),
    article: read("--site-muted", isDark ? "rgba(170, 165, 170, 0.68)" : "rgba(5, 5, 5, 0.58)"),
    structure: isDark ? "rgba(170, 165, 170, 0.2)" : "rgba(5, 5, 5, 0.18)",
    structureActive: isDark ? "rgba(170, 165, 170, 0.64)" : "rgba(5, 5, 5, 0.58)",
    reference: isDark ? "rgba(170, 165, 170, 0.32)" : "rgba(5, 5, 5, 0.28)",
    text: read("--site-ink", isDark ? "#aaa5aa" : "#050505"),
    textSoft: read("--site-muted", isDark ? "rgba(170, 165, 170, 0.68)" : "rgba(5, 5, 5, 0.58)"),
    bg: read("--site-bg", isDark ? "#000000" : "#ffffff"),
    labelBg: isDark ? "rgba(0, 0, 0, 0.82)" : "rgba(255, 255, 255, 0.82)",
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

function createClusterAnchors(nodes: RuntimeNode[], width = 860, height = 540) {
  const clusterKeys = Array.from(
    new Set(
      nodes
        .filter((node) => node.type !== "root")
        .map((node) => node.clusterKey),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));

  const radiusX = Math.min(width * 0.28, 300);
  const radiusY = Math.min(height * 0.22, 170);
  const anchors = new Map<string, { x: number; y: number }>();

  clusterKeys.forEach((key, index) => {
    const angle = index * GOLDEN_ANGLE;
    const ring = 0.54 + 0.46 * seededNoise(index + 1.7);
    anchors.set(key, {
      x: Math.cos(angle) * radiusX * ring,
      y: Math.sin(angle) * radiusY * ring,
    });
  });

  anchors.set("__root__", { x: 0, y: 0 });
  return anchors;
}

function seedForcePositions(nodes: RuntimeNode[]) {
  const anchors = createClusterAnchors(nodes);
  const groupedNodes = new Map<string, RuntimeNode[]>();

  nodes.forEach((node) => {
    const list = groupedNodes.get(node.clusterKey);
    if (list) {
      list.push(node);
    } else {
      groupedNodes.set(node.clusterKey, [node]);
    }
  });

  nodes.forEach((node, nodeIndex) => {
    const anchor = anchors.get(node.clusterKey) || { x: 0, y: 0 };

    if (node.type === "root") {
      node.x = 0;
      node.y = 0;
      node.vx = 0;
      node.vy = 0;
      node.anchorX = 0;
      node.anchorY = 0;
      return;
    }

    const group = groupedNodes.get(node.clusterKey) || [node];
    const index = Math.max(group.indexOf(node), 0);
    const row = index - (group.length - 1) / 2;
    const sway = (seededNoise(nodeIndex + 9.3) - 0.5) * 44;
    const tier = node.type === "section" ? 0.38 : 1;

    node.anchorX = anchor.x + sway * tier;
    node.anchorY = anchor.y + row * 19 * tier + (seededNoise(nodeIndex + 11.7) - 0.5) * 18;
    node.x = node.anchorX + (seededNoise(nodeIndex + 3.1) - 0.5) * 56;
    node.y = node.anchorY + (seededNoise(nodeIndex + 4.6) - 0.5) * 44;
    node.vx = 0;
    node.vy = 0;
  });
}

function createClusterForce(strength = 0.035): Force {
  let nodes: RuntimeNode[] = [];

  const force = (alpha: number) => {
    nodes.forEach((node) => {
      if (node.type === "root") return;
      const localStrength =
        strength * alpha * (node.type === "section" ? 1.2 : 0.72);
      node.vx = (node.vx ?? 0) + (node.anchorX - (node.x ?? 0)) * localStrength;
      node.vy = (node.vy ?? 0) + (node.anchorY - (node.y ?? 0)) * localStrength;
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
  seedForcePositions(runtimeNodes);

  return {
    nodeMap,
    runtimeNodes,
    runtimeLinks,
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
  const { nodeMap, runtimeNodes, runtimeLinks } = createRuntimeGraph(payload);

  const canvas = document.createElement("canvas");
  canvas.className = "global-graph-canvas-surface";
  canvas.setAttribute("aria-hidden", "true");
  mount.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable.");
  }

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
        .forceLink(runtimeLinks)
        .id((node: RuntimeNode) => node.id)
        .iterations(2)
        .distance((link: RuntimeLink) => {
          if (link.kind === "reference") {
            return link.source.clusterKey === link.target.clusterKey ? 58 : 96;
          }
          if (link.source.type === "root" || link.target.type === "root") {
            return 112;
          }
          return link.source.type === "section" && link.target.type === "article"
            ? 42
            : 68;
        })
        .strength((link: RuntimeLink) => {
          if (link.kind === "reference") {
            return link.source.clusterKey === link.target.clusterKey ? 0.18 : 0.08;
          }
          if (link.source.type === "root" || link.target.type === "root") {
            return 0.16;
          }
          return 0.62;
        }),
    )
    .force(
      "charge",
      forceModule
        .forceManyBody()
        .strength((node: RuntimeNode) => {
          if (node.type === "root") return -420;
          if (node.type === "section") return -180 - node.degree * 8;
          return -42 - node.degree * 1.8;
        })
        .distanceMin(14)
        .distanceMax(280),
    )
    .force(
      "collide",
      forceModule
        .forceCollide((node: RuntimeNode) => node.radius + 9)
        .strength(0.86)
        .iterations(2),
    )
    .force("center", forceModule.forceCenter(0, 0))
    .force("cluster", createClusterForce(0.04));

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
    worldX: number;
    worldY: number;
    nodeId: string | null;
  } | null = null;
  let lastPointer: { x: number; y: number; worldX: number; worldY: number } | null =
    null;

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

  function getNodeAtPoint(x: number, y: number) {
    let bestNode: RuntimeNode | null = null;
    let bestDistance = Infinity;

    runtimeNodes.forEach((node) => {
      const point = worldToScreen(node.x, node.y);
      const radius = Math.max(8, node.radius * view.zoom + 5);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= radius && distance < bestDistance) {
        bestNode = node;
        bestDistance = distance;
      }
    });

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

  function drawLinks(focusSet: Set<string>) {
    runtimeLinks.forEach((link) => {
      const source = worldToScreen(link.source.x, link.source.y);
      const target = worldToScreen(link.target.x, link.target.y);
      const isFocused = focusSet.has(link.source.id) && focusSet.has(link.target.id);
      const isCurrent =
        link.source.id === currentNodeId || link.target.id === currentNodeId;

      ctx.save();
      ctx.strokeStyle =
        isCurrent || isFocused
          ? palette.structureActive
          : link.kind === "reference"
            ? palette.reference
            : palette.structure;
      ctx.globalAlpha =
        link.kind === "reference"
          ? isFocused
            ? 0.72
            : 0.2
          : isFocused
            ? 0.82
            : 0.26;
      ctx.lineWidth = (isCurrent ? 1.35 : link.kind === "reference" ? 0.7 : 0.9) * Math.sqrt(view.zoom);
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      const curve = link.kind === "reference" ? 12 : 4;
      ctx.quadraticCurveTo(midX, midY - curve, target.x, target.y);
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
        const dx = pointer.worldX - pointerDownState.worldX;
        const dy = pointer.worldY - pointerDownState.worldY;
        dragNode.fx = pointer.worldX;
        dragNode.fy = pointer.worldY;

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
      nodeId: node?.id ?? null,
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
      ? Math.hypot(pointer.x - pointerDownState.x, pointer.y - pointerDownState.y)
      : Infinity;

    if (
      pointerDownState &&
      movedDistance < 7 &&
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
  const locationLabel = modalEl.querySelector("[data-current-location]");

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
  const locationLabelEl =
    locationLabel instanceof HTMLElement ? locationLabel : null;

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

  function applyCurrentInfo(info: ReturnType<typeof determineCurrentNode>) {
    currentNodeId = info.nodeId;

    if (locationLabelEl) {
      locationLabelEl.textContent = info.label;
      if (locationLabelEl instanceof HTMLAnchorElement) {
        locationLabelEl.href = info.route;
      }
    }

    modalEl.querySelectorAll(".graph-tree-link").forEach((link) => {
      if (!(link instanceof HTMLElement)) return;
      const linkRoute = normalizeRoute(
        link.getAttribute("data-route-target") ||
          link.getAttribute("href") ||
          "",
      );
      const sectionPath = link.getAttribute("data-section-path");
      const isArticle = link.classList.contains("graph-tree-link-article");
      const isCurrent = isArticle
        ? linkRoute === info.route
        : sectionPath
          ? info.route === linkRoute || info.route.startsWith(`${linkRoute}/`)
          : linkRoute === info.route;
      link.classList.toggle("is-current", isCurrent);
    });

    modalEl.querySelectorAll("[data-section-path]").forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      const sectionPath = element.getAttribute("data-section-path");
      if (!sectionPath) return;

      const sectionRoute = normalizeRoute(`/articles/${sectionPath}`);
      const active =
        info.route === sectionRoute || info.route.startsWith(`${sectionRoute}/`);

      if (element.classList.contains("graph-tree-item-section")) {
        element.classList.toggle("is-active", active);
      }

      if (element instanceof HTMLDetailsElement) {
        element.open = active || !sectionPath.includes("/");
      }
    });

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
        centerTreeOnCurrentItem();
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

  function centerTreeOnCurrentItem() {
    const treeShell = modalEl.querySelector(".global-graph-tree-shell");
    if (!(treeShell instanceof HTMLElement)) return;

    const activeLink =
      (currentNodeId
        ? modalEl.querySelector(
            `[data-node-target="${CSS.escape(currentNodeId)}"]`,
          )
        : null) ||
      modalEl.querySelector(".graph-tree-link-article.is-current") ||
      modalEl.querySelector(".graph-tree-link-section.is-current");

    if (!(activeLink instanceof HTMLElement)) return;

    const shellRect = treeShell.getBoundingClientRect();
    const activeRect = activeLink.getBoundingClientRect();
    const nextTop =
      treeShell.scrollTop +
      (activeRect.top - shellRect.top) -
      shellRect.height / 2 +
      activeRect.height / 2;

    treeShell.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
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
    centerTreeOnCurrentItem();

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
    centerTreeOnCurrentItem();
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

  if (locationLabelEl instanceof HTMLAnchorElement) {
    addListener(locationLabelEl, "click", (event) => {
      event.preventDefault();
      syncCurrentLocation();
      centerTreeOnCurrentItem();
      graphRuntime?.setCurrentNode(currentNodeId, true);
    });
  }

  addListener(document, "keydown", onKeydown);
  addListener(window, "resize", () => {
    if (!isOpen) return;
    graphRuntime?.resize();
  });
  addListener(document, "astro:after-swap", syncAfterNavigation);
  addListener(document, "astro:page-load", syncAfterNavigation);
  addListener(document, "swup:contentReplaced", syncAfterNavigation);
  addListener(document, "swup:fragmentReplaced", syncAfterNavigation);
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
