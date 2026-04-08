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

type ThreeModule = typeof import("three");
type ForceModule = typeof import("d3-force-3d");
type OrbitControlsModule = typeof import(
  "three/examples/jsm/controls/OrbitControls.js"
);
type Css2dModule = typeof import("three/examples/jsm/renderers/CSS2DRenderer.js");

type RuntimeNode = GraphNode & {
  degree: number;
  neighbors: Set<string>;
  position: import("three").Vector3;
  baseRadius: number;
  mesh: import("three").Mesh;
  halo: import("three").Mesh;
  labelElement: HTMLDivElement;
  labelObject: InstanceType<Css2dModule["CSS2DObject"]>;
  clusterKey: string;
  clusterColor: string;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
  index?: number;
};

type RuntimeLink = GraphLink & {
  source: RuntimeNode;
  target: RuntimeNode;
  line: import("three").Line;
  material: import("three").LineBasicMaterial;
  baseColor: string;
};

type ThemePalette = {
  root: string;
  section: string;
  article: string;
  structure: string;
  structureActive: string;
  reference: string;
  text: string;
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

const GRAPH_MODULES = () =>
  Promise.all([
    import("three"),
    import("d3-force-3d"),
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/renderers/CSS2DRenderer.js"),
  ]);

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const CLUSTER_SWATCHES = [
  "#22d3ee",
  "#38bdf8",
  "#6366f1",
  "#f43f5e",
  "#f59e0b",
  "#84cc16",
  "#a855f7",
  "#14b8a6",
];

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
    root: read("--color-secondary-900", isDark ? "#e2e8f0" : "#0f172a"),
    section: read("--color-primary-500", "#3b82f6"),
    article: read("--color-primary-400", "#38bdf8"),
    structure: isDark ? "rgba(148, 163, 184, 0.34)" : "rgba(100, 116, 139, 0.28)",
    structureActive: isDark
      ? "rgba(148, 197, 255, 0.62)"
      : "rgba(59, 130, 246, 0.56)",
    reference: isDark ? "rgba(56, 189, 248, 0.54)" : "rgba(14, 165, 233, 0.48)",
    text: isDark ? "#f8fafc" : "#0f172a",
  };
}

function fibonacciSpherePoint(
  three: ThreeModule,
  index: number,
  total: number,
  radius: number,
  phase = 0,
) {
  const safeTotal = Math.max(total, 1);
  const y = 1 - ((index + 0.5) / safeTotal) * 2;
  const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * (index + phase * safeTotal);

  return new three.Vector3(
    Math.cos(theta) * ringRadius * radius,
    y * radius,
    Math.sin(theta) * ringRadius * radius,
  );
}

function fibonacciDirection(
  three: ThreeModule,
  index: number,
  total: number,
  phase = 0,
) {
  return fibonacciSpherePoint(three, index, total, 1, phase).normalize();
}

function getClusterKey(node: GraphNode) {
  if (node.type === "root") return "__root__";
  return node.topSectionPath || node.sectionPath || node.id;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function tintColor(
  three: ThreeModule,
  colorValue: string,
  saturationShift: number,
  lightnessShift: number,
) {
  const color = new three.Color(colorValue);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(
    hsl.h,
    clampNumber(hsl.s + saturationShift, 0, 1),
    clampNumber(hsl.l + lightnessShift, 0, 1),
  );
  return `#${color.getHexString()}`;
}

function createClusterColorMap(nodes: GraphNode[]) {
  const clusterKeys = Array.from(
    new Set(
      nodes
        .filter((node) => node.type !== "root")
        .map((node) => getClusterKey(node)),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));

  return new Map(
    clusterKeys.map((key, index) => [
      key,
      CLUSTER_SWATCHES[index % CLUSTER_SWATCHES.length],
    ]),
  );
}

function seedForcePositions(three: ThreeModule, nodes: RuntimeNode[]) {
  const clusterKeys = Array.from(
    new Set(
      nodes
        .filter((node) => node.type !== "root")
        .map((node) => node.clusterKey),
    ),
  );
  const clusterAnchors = new Map<string, import("three").Vector3>();

  clusterKeys.forEach((key, index) => {
    const anchor = fibonacciSpherePoint(three, index, clusterKeys.length, 8.6, 0.12);
    anchor.y *= clusterKeys.length <= 5 ? 0.72 : 0.82;
    anchor.z *= 1.08;
    clusterAnchors.set(key, anchor);
  });

  const groupedNodes = new Map<string, RuntimeNode[]>();
  nodes
    .filter((node) => node.type !== "root")
    .forEach((node) => {
      const list = groupedNodes.get(node.clusterKey);
      if (list) {
        list.push(node);
      } else {
        groupedNodes.set(node.clusterKey, [node]);
      }
    });

  nodes.forEach((node) => {
    if (node.type === "root") {
      node.x = 0;
      node.y = 0;
      node.z = 0;
      node.fx = 0;
      node.fy = 0;
      node.fz = 0;
      return;
    }

    const group = groupedNodes.get(node.clusterKey) || [node];
    const index = group.indexOf(node);
    const anchor = clusterAnchors.get(node.clusterKey) || new three.Vector3();
    const spread = node.type === "section" ? 1.35 : 2.2;
    const orbit = fibonacciSpherePoint(three, index, group.length, spread, 0.31);
    orbit.y *= 0.84;
    orbit.z *= 1.14;

    node.x =
      anchor.x +
      orbit.x * (node.type === "section" ? 0.5 : 0.82) +
      (seededNoise(index * 7.1 + group.length) - 0.5) * 0.6;
    node.y =
      anchor.y +
      orbit.y * (node.type === "section" ? 0.44 : 0.72) +
      (seededNoise(index * 8.3 + group.length * 0.7) - 0.5) * 0.46;
    node.z =
      anchor.z +
      orbit.z * (node.type === "section" ? 0.68 : 1.08) +
      (seededNoise(index * 10.7 + group.length * 0.33) - 0.5) * 0.86;
    node.vx = 0;
    node.vy = 0;
    node.vz = 0;
    node.fx = undefined;
    node.fy = undefined;
    node.fz = undefined;
  });
}

function createClusterForce(strength = 0.22) {
  let nodes: RuntimeNode[] = [];

  const force = (alpha: number) => {
    const centers = new Map<
      string,
      { x: number; y: number; z: number; count: number }
    >();

    nodes.forEach((node) => {
      if (node.type === "root") return;
      const key = node.clusterKey;
      const center = centers.get(key) || { x: 0, y: 0, z: 0, count: 0 };
      center.x += node.x ?? 0;
      center.y += node.y ?? 0;
      center.z += node.z ?? 0;
      center.count += 1;
      centers.set(key, center);
    });

    centers.forEach((center) => {
      center.x = (center.x / center.count) * 0.92;
      center.y = (center.y / center.count) * 0.92;
      center.z = (center.z / center.count) * 0.92;
    });

    nodes.forEach((node) => {
      if (node.type === "root") return;
      const center = centers.get(node.clusterKey);
      if (!center) return;

      const localStrength =
        strength *
        alpha *
        (node.type === "section" ? 1.18 : 0.92) *
        (node.degree > 5 ? 0.9 : 1);

      node.vx = (node.vx ?? 0) + (center.x - (node.x ?? 0)) * localStrength;
      node.vy = (node.vy ?? 0) + (center.y - (node.y ?? 0)) * localStrength;
      node.vz = (node.vz ?? 0) + (center.z - (node.z ?? 0)) * localStrength;
    });
  };

  force.initialize = (_nodes: RuntimeNode[]) => {
    nodes = _nodes;
  };

  return force;
}

function applyForceLayout(
  three: ThreeModule,
  forceModule: ForceModule,
  nodes: RuntimeNode[],
  links: RuntimeLink[],
) {
  seedForcePositions(three, nodes);

  const simulation = forceModule.forceSimulation(nodes, 3).stop();
  simulation
    .alpha(0.96)
    .alphaDecay(0.032)
    .velocityDecay(0.24)
    .force(
      "link",
      forceModule
        .forceLink(links)
        .id((node: RuntimeNode) => node.id)
        .iterations(2)
        .distance((link: RuntimeLink) => {
          if (link.kind === "reference") {
            return link.source.clusterKey === link.target.clusterKey ? 2.8 : 4.2;
          }
          if (link.source.type === "root" || link.target.type === "root") {
            return 4.6;
          }
          return link.source.type === "section" && link.target.type === "article"
            ? 2.2
            : 3.1;
        })
        .strength((link: RuntimeLink) => {
          if (link.kind === "reference") {
            return link.source.clusterKey === link.target.clusterKey ? 0.24 : 0.11;
          }
          if (link.source.type === "root" || link.target.type === "root") {
            return 0.2;
          }
          return 0.7;
        }),
    )
    .force(
      "charge",
      forceModule
        .forceManyBody()
        .strength((node: RuntimeNode) => {
          if (node.type === "root") return -220;
          if (node.type === "section") return -185 - node.degree * 6;
          return -44 - node.degree * 1.6;
        })
        .distanceMin(1.3)
        .distanceMax(18),
    )
    .force(
      "collide",
      forceModule
        .forceCollide((node: RuntimeNode) =>
          node.type === "root" ? 2.2 : node.type === "section" ? 1.28 : 0.72,
        )
        .strength(0.95)
        .iterations(2),
    )
    .force("center", forceModule.forceCenter(0, 0, 0).strength(0.08))
    .force("cluster", createClusterForce(0.22));

  simulation.tick(360);

  const activeNodes = nodes.filter((node) => node.type !== "root");
  const center = activeNodes.reduce(
    (accumulator, node) =>
      accumulator.add(
        new three.Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0),
      ),
    new three.Vector3(),
  );

  if (activeNodes.length > 0) {
    center.multiplyScalar(1 / activeNodes.length);
  }

  const maxDistance = Math.max(
    1,
    ...activeNodes.map((node) =>
      new three.Vector3(
        (node.x ?? 0) - center.x,
        (node.y ?? 0) - center.y,
        (node.z ?? 0) - center.z,
      ).length(),
    ),
  );
  const scale = 8.6 / maxDistance;

  nodes.forEach((node) => {
    if (node.type === "root") {
      node.position.set(0, 0, 0);
      return;
    }

    node.position.set(
      ((node.x ?? 0) - center.x) * scale,
      ((node.y ?? 0) - center.y) * scale * 0.92,
      ((node.z ?? 0) - center.z) * scale * 1.12,
    );
  });
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

async function createGraphRuntime(options: {
  stage: HTMLElement;
  mount: HTMLElement;
  tooltip: HTMLElement;
  status: HTMLElement | null;
  payload: GraphPayload;
  getCurrentNodeId: () => string;
  navigateTo: (route: string) => void;
}) {
  const [THREE, forceModule, controlsModule, css2dModule] = await GRAPH_MODULES();
  const { OrbitControls } = controlsModule as OrbitControlsModule;
  const { CSS2DRenderer, CSS2DObject } = css2dModule as Css2dModule;
  const palette = getThemePalette();
  const { stage, mount, tooltip, status, payload, getCurrentNodeId, navigateTo } =
    options;
  const clusterColorMap = createClusterColorMap(payload.nodes);

  const nodeMap = new Map<string, RuntimeNode>();
  const runtimeNodes = payload.nodes.map((node) => {
    const baseRadius =
      node.type === "root" ? 0.34 : node.type === "section" ? 0.24 : 0.13;
    const clusterKey = getClusterKey(node);
    const baseClusterColor = clusterColorMap.get(clusterKey) || palette.section;
    const clusterColor =
      node.type === "root"
        ? palette.root
        : node.type === "section"
          ? tintColor(THREE, baseClusterColor, 0.06, -0.02)
          : tintColor(THREE, baseClusterColor, -0.03, 0.08);

    const runtimeNode = {
      ...node,
      degree: 0,
      neighbors: new Set<string>(),
      position: new THREE.Vector3(),
      baseRadius,
      mesh: null as unknown as import("three").Mesh,
      halo: null as unknown as import("three").Mesh,
      labelElement: document.createElement("div"),
      labelObject: null as unknown as InstanceType<Css2dModule["CSS2DObject"]>,
      clusterKey,
      clusterColor,
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
        line: null as unknown as import("three").Line,
        material: null as unknown as import("three").LineBasicMaterial,
        baseColor:
          link.kind === "reference"
            ? tintColor(THREE, source.clusterColor, 0, 0.02)
            : tintColor(
                THREE,
                source.type === "root" ? target.clusterColor : source.clusterColor,
                0.02,
                -0.02,
              ),
      };
    })
    .filter(Boolean) as RuntimeLink[];

  applyForceLayout(THREE, forceModule as ForceModule, runtimeNodes, runtimeLinks);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  mount.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.classList.add("global-graph-label-layer");
  mount.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.82;
  controls.minDistance = 16;
  controls.maxDistance = 34;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  const domeLight = new THREE.HemisphereLight(0xffffff, 0xd7e3f4, 0.18);
  domeLight.position.set(0, 1, 0);
  scene.add(ambientLight, domeLight);

  const graphGroup = new THREE.Group();
  const linkGroup = new THREE.Group();
  const nodeGroup = new THREE.Group();
  graphGroup.add(linkGroup, nodeGroup);
  scene.add(graphGroup);

  const materialsByType = {
    root: new THREE.MeshStandardMaterial({
      color: palette.root,
      emissive: palette.root,
      emissiveIntensity: 0.1,
      metalness: 0.02,
      roughness: 0.42,
      transparent: true,
      opacity: 0.98,
    }),
    section: new THREE.MeshStandardMaterial({
      color: palette.section,
      emissive: palette.section,
      emissiveIntensity: 0.13,
      metalness: 0.02,
      roughness: 0.52,
      transparent: true,
      opacity: 0.94,
    }),
    article: new THREE.MeshStandardMaterial({
      color: palette.article,
      emissive: palette.article,
      emissiveIntensity: 0.08,
      metalness: 0,
      roughness: 0.58,
      transparent: true,
      opacity: 0.92,
    }),
  };

  const haloMaterialsByType = {
    root: new THREE.MeshBasicMaterial({
      color: palette.root,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    section: new THREE.MeshBasicMaterial({
      color: palette.section,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    article: new THREE.MeshBasicMaterial({
      color: palette.article,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };

  runtimeNodes.forEach((node) => {
    const geometry = new THREE.SphereGeometry(node.baseRadius, 24, 24);
    const mesh = new THREE.Mesh(
      geometry,
      materialsByType[node.type].clone(),
    );
    mesh.position.copy(node.position);
    mesh.userData.nodeId = node.id;
    mesh.userData.route = node.route;

    const halo = new THREE.Mesh(
      geometry,
      haloMaterialsByType[node.type].clone(),
    );
    halo.visible = false;
    halo.scale.setScalar(node.type === "root" ? 1.32 : 1.46);
    mesh.add(halo);

    const labelElement = document.createElement("div");
    labelElement.className = `global-graph-label global-graph-label-${node.type}`;
    labelElement.textContent = node.label;
    labelElement.style.setProperty("--node-accent", node.clusterColor);
    const labelObject = new CSS2DObject(labelElement);
    labelObject.position.set(0, node.baseRadius + 0.38, 0);
    labelObject.visible = true;
    mesh.add(labelObject);

    node.mesh = mesh;
    node.halo = halo;
    node.labelElement = labelElement;
    node.labelObject = labelObject;
    nodeGroup.add(mesh);
  });

  runtimeLinks.forEach((link) => {
    const material = new THREE.LineBasicMaterial({
      color: link.baseColor,
      transparent: true,
      opacity: link.kind === "reference" ? 0.18 : 0.2,
      depthWrite: false,
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([
      link.source.position.clone(),
      link.target.position.clone(),
    ]);

    const line = new THREE.Line(geometry, material);
    link.material = material;
    link.line = line;
    linkGroup.add(line);
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const frontVector = new THREE.Vector3(0, 0, 1);
  const targetQuaternion = new THREE.Quaternion();
  const yTiltAxis = new THREE.Vector3(0, 1, 0);
  let hoverNodeId: string | null = null;
  let previewNodeId: string | null = null;
  let currentNodeId = getCurrentNodeId();
  let animationId: number | null = null;
  let isRunning = false;
  let disposed = false;
  let pointerDownState: {
    x: number;
    y: number;
    nodeId: string | null;
  } | null = null;

  function getNodeColor(node: RuntimeNode) {
    if (node.type === "root") return palette.root;
    return node.clusterColor;
  }

  function updateTooltip() {
    tooltip.hidden = true;
  }

  function getFocusNodeId() {
    return previewNodeId || hoverNodeId || currentNodeId || "root";
  }

  function updateVisualState() {
    const focusNode = nodeMap.get(getFocusNodeId()) ?? nodeMap.get("root");
    const focusSet = focusNode
      ? new Set([focusNode.id, ...focusNode.neighbors])
      : new Set<string>();
    const childLabelSet = new Set<string>();
    const relatedLabelSet = new Set<string>();

    if (focusNode && focusNode.type !== "article") {
      runtimeLinks.forEach((link) => {
        if (link.kind === "structure" && link.source.id === focusNode.id) {
          childLabelSet.add(link.target.id);
        }
      });
    }

    if (focusNode?.type === "article") {
      runtimeLinks.forEach((link) => {
        if (link.kind !== "reference") return;
        if (link.source.id === focusNode.id && link.target.type === "article") {
          relatedLabelSet.add(link.target.id);
        }
        if (link.target.id === focusNode.id && link.source.type === "article") {
          relatedLabelSet.add(link.source.id);
        }
      });
    }

    runtimeLinks.forEach((link) => {
      const isFocused =
        focusSet.has(link.source.id) && focusSet.has(link.target.id);
      const isCurrentLink =
        link.source.id === currentNodeId || link.target.id === currentNodeId;

      link.material.color.set(
        isCurrentLink ? palette.structureActive : link.baseColor,
      );
      link.material.opacity =
        link.kind === "reference"
          ? isFocused
            ? 0.5
            : 0.05
          : isFocused
            ? isCurrentLink
              ? 0.62
              : 0.34
            : 0.09;
    });

    runtimeNodes.forEach((node) => {
      const material = node.mesh.material as import("three").MeshStandardMaterial;
      const haloMaterial = node.halo.material as import("three").MeshBasicMaterial;
      const isCurrent = node.id === currentNodeId;
      const isPreview = node.id === previewNodeId;
      const isHover = node.id === hoverNodeId;
      const isFocusMember = focusSet.has(node.id);
      const emphasis = isCurrent
        ? node.type === "root"
          ? 1.22
          : 1.54
        : isPreview || isHover
          ? node.type === "root"
            ? 1.14
            : 1.34
          : isFocusMember
            ? 1.12
            : 0.9;

      material.color.set(getNodeColor(node));
      material.emissive.set(getNodeColor(node));
      material.opacity = isFocusMember ? 0.94 : 0.32;
      material.emissiveIntensity = isCurrent
        ? 0.24
        : isPreview || isHover
          ? 0.17
          : isFocusMember
            ? 0.1
            : 0.03;
      node.mesh.scale.setScalar(emphasis);

      node.halo.visible = isCurrent || isPreview || isHover;
      haloMaterial.color.set(getNodeColor(node));
      haloMaterial.opacity = isCurrent ? 0.09 : 0.05;
      node.halo.scale.setScalar(
        isCurrent ? (node.type === "root" ? 1.58 : 1.94) : 1.44,
      );

      const showLabel =
        isCurrent ||
        isPreview ||
        isHover ||
        node.type === "root" ||
        childLabelSet.has(node.id) ||
        relatedLabelSet.has(node.id) ||
        (isFocusMember && node.type === "section" && focusNode?.type !== "root");
      node.labelElement.classList.toggle("is-visible", showLabel);
      node.labelElement.classList.toggle("is-current", isCurrent);
      node.labelElement.classList.toggle("is-hover", isPreview || isHover);
      node.labelElement.classList.toggle(
        "is-child",
        childLabelSet.has(node.id) && !isCurrent && !isPreview && !isHover,
      );
      node.labelElement.classList.toggle(
        "is-related",
        relatedLabelSet.has(node.id) && !isCurrent && !isPreview && !isHover,
      );
      node.labelElement.classList.toggle("is-dimmed", !showLabel);
    });
  }

  function syncCameraDistance() {
    const distance = window.innerWidth <= 640 ? 22 : 19.5;
    camera.position.set(0, 0, distance);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function centerOnNode(nodeId: string, force = false) {
    const focusNode = nodeMap.get(nodeId) ?? nodeMap.get("root");
    if (!focusNode) return;

    syncCameraDistance();

    if (focusNode.position.lengthSq() < 0.001) {
      targetQuaternion.identity();
    } else {
      targetQuaternion.setFromUnitVectors(
        focusNode.position.clone().normalize(),
        frontVector,
      );
      targetQuaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          yTiltAxis,
          focusNode.type === "article" ? 0.04 : 0.08,
        ),
      );
    }

    if (force) {
      graphGroup.quaternion.copy(targetQuaternion);
    } else {
      graphGroup.quaternion.copy(targetQuaternion);
    }
    updateVisualState();
  }

  function render() {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  function loop() {
    if (!isRunning || disposed) return;
    animationId = window.requestAnimationFrame(loop);
    controls.update();
    render();
  }

  function resize() {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
    render();
  }

  function getIntersectedNode(clientX: number, clientY: number) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersect = raycaster.intersectObjects(
      runtimeNodes.map((node) => node.mesh),
      false,
    )[0];
    const nodeId = intersect?.object?.userData?.nodeId;
    return nodeId ? nodeMap.get(nodeId) ?? null : null;
  }

  function setHoverNode(nodeId: string | null) {
    hoverNodeId = nodeId;
    updateVisualState();
  }

  function setPreviewNode(nodeId: string | null) {
    previewNodeId = nodeId;
    updateVisualState();
  }

  function updateTheme() {
    const nextPalette = getThemePalette();
    Object.assign(palette, nextPalette);
    updateVisualState();
    render();
  }

  function start() {
    if (isRunning || disposed) return;
    isRunning = true;
    mount.classList.add("is-ready");
    stage.classList.add("is-ready");
    if (status) status.hidden = true;
    resize();
    updateVisualState();
    loop();
  }

  function stop() {
    isRunning = false;
    if (animationId != null) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    controls.dispose();
    runtimeLinks.forEach((link) => {
      link.line.geometry.dispose();
      link.material.dispose();
    });
    runtimeNodes.forEach((node) => {
      node.mesh.geometry.dispose();
      (node.mesh.material as import("three").Material).dispose();
      (node.halo.material as import("three").Material).dispose();
      node.labelObject.removeFromParent();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    labelRenderer.domElement.remove();
    scene.clear();
  }

  controls.addEventListener("start", () => {
    mount.classList.add("is-dragging");
  });
  controls.addEventListener("end", () => {
    mount.classList.remove("is-dragging");
  });

  renderer.domElement.addEventListener(
    "pointermove",
    (event) => {
      const node = getIntersectedNode(event.clientX, event.clientY);
      renderer.domElement.style.cursor = node ? "pointer" : "grab";
      setHoverNode(node?.id ?? null);
      updateTooltip();
      render();
    },
    { passive: true },
  );

  renderer.domElement.addEventListener(
    "pointerleave",
    () => {
      renderer.domElement.style.cursor = "grab";
      setHoverNode(null);
      updateTooltip();
      render();
    },
    { passive: true },
  );

  renderer.domElement.addEventListener(
    "pointerdown",
    (event) => {
      const node = getIntersectedNode(event.clientX, event.clientY);
      pointerDownState = {
        x: event.clientX,
        y: event.clientY,
        nodeId: node?.id ?? null,
      };
    },
    { passive: true },
  );

  renderer.domElement.addEventListener(
    "pointerup",
    (event) => {
      const node = getIntersectedNode(event.clientX, event.clientY);
      const movedDistance = pointerDownState
        ? Math.hypot(
            event.clientX - pointerDownState.x,
            event.clientY - pointerDownState.y,
          )
        : Infinity;

      if (
        pointerDownState &&
        movedDistance < 8 &&
        pointerDownState.nodeId &&
        pointerDownState.nodeId === node?.id
      ) {
        navigateTo(node.route);
      }

      pointerDownState = null;
    },
    { passive: true },
  );

  currentNodeId = getCurrentNodeId();
  centerOnNode(currentNodeId, true);
  resize();
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

  modal.dataset.graphBound = "true";

  const stage = modal.querySelector("[data-graph-stage]");
  const mount = modal.querySelector("[data-graph-canvas]");
  const tooltip = modal.querySelector("[data-graph-tooltip]");
  const status = modal.querySelector("[data-graph-status]");
  const dataElement = modal.querySelector("[data-global-graph-json]");
  const locationLabel = modal.querySelector("[data-current-location]");

  if (
    !(stage instanceof HTMLElement) ||
    !(mount instanceof HTMLElement) ||
    !(tooltip instanceof HTMLElement) ||
    !(dataElement instanceof HTMLScriptElement)
  ) {
    return;
  }

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
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("global-graph-open");
    syncButtons(false);
    isOpen = false;
    tooltip.hidden = true;
    graphRuntime?.stop();
  }

  function applyCurrentInfo(info: ReturnType<typeof determineCurrentNode>) {
    currentNodeId = info.nodeId;

    if (locationLabel) {
      locationLabel.textContent = info.label;
      if (locationLabel instanceof HTMLAnchorElement) {
        locationLabel.href = info.route;
      }
    }

    modal.querySelectorAll(".graph-tree-link").forEach((link) => {
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

    modal.querySelectorAll("[data-section-path]").forEach((element) => {
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
    const treeShell = modal.querySelector(".global-graph-tree-shell");
    if (!(treeShell instanceof HTMLElement)) return;

    const activeLink =
      (currentNodeId
        ? modal.querySelector(
            `[data-node-target="${CSS.escape(currentNodeId)}"]`,
          )
        : null) ||
      modal.querySelector(".graph-tree-link-article.is-current") ||
      modal.querySelector(".graph-tree-link-section.is-current");

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

    if (status instanceof HTMLElement) {
      status.hidden = false;
      status.textContent = "正在加载 3D 知识图谱...";
    }

    graphRuntimePromise = createGraphRuntime({
      stage,
      mount,
      tooltip,
      status: status instanceof HTMLElement ? status : null,
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
        console.error("3D 图谱加载失败:", error);
        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.textContent =
            error instanceof Error &&
            /Failed to fetch dynamically imported module|Outdated Optimize Dep/i.test(
              error.message,
            )
              ? "开发服务器的 three 依赖缓存已过期，请刷新页面；如果还不行，重启 npm run dev。"
              : "3D 图谱初始化失败，请稍后刷新重试。";
        }
        graphRuntimePromise = null;
        throw error;
      });

    return graphRuntimePromise;
  }

  async function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
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

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      closeModal();
    }
  }

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

  modal.querySelectorAll("[data-close-global-graph]").forEach((element) => {
    addListener(element, "click", closeModal);
  });

  modal.querySelectorAll(".graph-tree-link").forEach((link) => {
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

  if (locationLabel instanceof HTMLAnchorElement) {
    addListener(locationLabel, "click", (event) => {
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
    modal.dataset.graphBound = "false";
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
