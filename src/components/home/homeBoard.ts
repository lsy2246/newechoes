export type HomeBoardDevice = "desktop" | "mobile";

export type HomeBoardRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type HomeBoardViewport = {
  width: number;
  height: number;
  initialX: number;
  initialY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type HomeBoardChrome = {
  title: string;
  subtitle: string;
  pills: { label: string; accent?: boolean }[];
  workspaceLabel: string;
  workspaceTitle: string;
  sidebarItems: { label: string; active?: boolean }[];
  routesLabel: string;
  routes: string[];
  boardStatus: string;
  footer: string;
};

export type HomeBoardConnector = {
  id: string;
  tone: "ink" | "soft" | "amber";
  points: [number, number][];
};

export type HomeBoardItem =
  | {
      id: string;
      kind: "hero";
      tone: "paper";
      x: number;
      y: number;
      w: number;
      h: number;
      rotate?: number;
      eyebrow: string;
      title: string;
      subtitle: string;
      chips: string[];
    }
  | {
      id: string;
      kind: "card";
      tone: "paper" | "accent" | "ghost";
      x: number;
      y: number;
      w: number;
      h: number;
      rotate?: number;
      eyebrow: string;
      value: string;
      body: string[];
      valueSize?: "xl" | "lg" | "md" | "sm";
    }
  | {
      id: string;
      kind: "note";
      tone: "amber" | "paper" | "ghost";
      x: number;
      y: number;
      w: number;
      h: number;
      rotate?: number;
      eyebrow: string;
      value: string;
      body?: string[];
      valueSize?: "lg" | "md" | "sm";
      dynamic?: "now";
    };

export type HomeBoardScreenLayout = {
  width: number;
  height: number;
  topbar: HomeBoardRect;
  sidebar?: HomeBoardRect;
  boardPanel: HomeBoardRect;
  boardViewport: HomeBoardRect;
};

export type HomeBoardContent = {
  chrome: HomeBoardChrome;
  device: HomeBoardDevice;
  screen: HomeBoardScreenLayout;
  stage: {
    width: number;
    height: number;
  };
  viewport: HomeBoardViewport;
  items: HomeBoardItem[];
  connectors: HomeBoardConnector[];
};

export type HomeBoardDynamicContent = {
  title: string;
  subtitle: string;
  stack: string;
  contact: string;
  postsLabel: string;
  thread: string;
  now: string;
};

const SCREEN_LAYOUTS: Record<HomeBoardDevice, HomeBoardScreenLayout> = {
  desktop: {
    width: 3072,
    height: 1728,
    topbar: { x: 0, y: 0, w: 0, h: 0 },
    boardPanel: { x: 0, y: 0, w: 3072, h: 1728 },
    boardViewport: { x: 0, y: 0, w: 3072, h: 1728 },
  },
  mobile: {
    width: 1280,
    height: 2765,
    topbar: { x: 0, y: 0, w: 0, h: 0 },
    boardPanel: { x: 0, y: 0, w: 1280, h: 2765 },
    boardViewport: { x: 0, y: 0, w: 1280, h: 2765 },
  },
};

const VIEWPORTS: Record<HomeBoardDevice, HomeBoardViewport> = {
  desktop: {
    width: 3072,
    height: 1728,
    initialX: 0,
    initialY: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  },
  mobile: {
    width: 1280,
    height: 2765,
    initialX: 0,
    initialY: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  },
};

const STAGES: Record<HomeBoardDevice, { width: number; height: number }> = {
  desktop: { width: 3072, height: 1728 },
  mobile: { width: 1280, height: 2765 },
};

const CHROME: HomeBoardChrome = {
  title: "today in echoes",
  subtitle: "personal workspace",
  pills: [
    { label: "local", accent: true },
    { label: "workspace" },
    { label: "updating" },
  ],
  workspaceLabel: "space",
  workspaceTitle: "lsy",
  sidebarItems: [
    { label: "主页画布", active: true },
    { label: "项目" },
    { label: "文章" },
    { label: "兴趣" },
  ],
  routesLabel: "links",
  routes: ["文章", "项目", "关于", "读书", "观影"],
  boardStatus: "workspace draft",
  footer: "echoes.now",
};

const createSharedItems = (
  dynamic: HomeBoardDynamicContent,
  device: HomeBoardDevice,
): HomeBoardItem[] => {
  if (device === "mobile") {
    return [
      {
        id: "hero",
        kind: "hero",
        tone: "paper",
        x: 112,
        y: 190,
        w: 1056,
        h: 390,
        eyebrow: "summary",
        title: "today",
        subtitle: "in echoes",
        chips: ["input", "process", "now"],
      },
      {
        id: "input",
        kind: "card",
        tone: "ghost",
        x: 112,
        y: 690,
        w: 1056,
        h: 330,
        eyebrow: "input",
        value: "film / travel / books",
        body: ["web / AI / life"],
        valueSize: "md",
      },
      {
        id: "process",
        kind: "card",
        tone: "paper",
        x: 112,
        y: 1110,
        w: 1056,
        h: 360,
        eyebrow: "process",
        value: "observe / archive / connect",
        body: ["test / build"],
        valueSize: "md",
      },
      {
        id: "now",
        kind: "card",
        tone: "accent",
        x: 112,
        y: 1560,
        w: 1056,
        h: 500,
        eyebrow: "now",
        value: dynamic.title,
        body: [
          "full-stack & AI",
          dynamic.stack,
          "blog.lsy22.com",
          "github.com/lsy2246",
        ],
        valueSize: "lg",
      },
      {
        id: "status",
        kind: "note",
        tone: "paper",
        x: 112,
        y: 2180,
        w: 1056,
        h: 230,
        eyebrow: "status",
        value: "local workspace · updating",
        body: [dynamic.now],
        valueSize: "md",
        dynamic: "now",
      },
    ];
  }

  return [
    {
      id: "hero",
      kind: "hero",
      tone: "paper",
      x: 220,
      y: 190,
      w: 850,
      h: 370,
      eyebrow: "summary",
      title: "today",
      subtitle: "in echoes",
      chips: ["input", "process", "now"],
    },
    {
      id: "input",
      kind: "card",
      tone: "ghost",
      x: 220,
      y: 760,
      w: 720,
      h: 420,
      rotate: -1.1,
      eyebrow: "input",
      value: "film / travel / books",
      body: ["web / AI / life"],
      valueSize: "md",
    },
    {
      id: "process",
      kind: "card",
      tone: "paper",
      x: 1148,
      y: 650,
      w: 760,
      h: 430,
      eyebrow: "process",
      value: "observe / archive / connect",
      body: ["test / build"],
      valueSize: "md",
    },
    {
      id: "now",
      kind: "card",
      tone: "accent",
      x: 2090,
      y: 470,
      w: 720,
      h: 600,
      rotate: 1,
      eyebrow: "now",
      value: dynamic.title,
      body: [
        "full-stack & AI",
        dynamic.stack,
        "blog.lsy22.com",
        "github.com/lsy2246",
      ],
      valueSize: "lg",
    },
    {
      id: "status",
      kind: "note",
      tone: "paper",
      x: 1138,
      y: 1250,
      w: 760,
      h: 180,
      rotate: 0.8,
      eyebrow: "status",
      value: "local workspace · updating",
      body: [dynamic.now],
      valueSize: "md",
      dynamic: "now",
    },
    {
      id: "contact",
      kind: "note",
      tone: "ghost",
      x: 2180,
      y: 1180,
      w: 540,
      h: 170,
      rotate: -1.2,
      eyebrow: "contact",
      value: dynamic.contact,
      valueSize: "sm",
    },
  ];
};

const createConnectors = (device: HomeBoardDevice): HomeBoardConnector[] => {
  if (device === "mobile") {
    return [
      {
        id: "hero-input",
        tone: "ink",
        points: [
          [640, 580],
          [640, 635],
          [640, 690],
        ],
      },
      {
        id: "input-process",
        tone: "soft",
        points: [
          [640, 1020],
          [640, 1065],
          [640, 1110],
        ],
      },
      {
        id: "process-now",
        tone: "amber",
        points: [
          [640, 1470],
          [640, 1515],
          [640, 1560],
        ],
      },
    ];
  }

  return [
    {
      id: "hero-input",
      tone: "ink",
      points: [
        [520, 560],
        [480, 660],
        [560, 760],
      ],
    },
    {
      id: "hero-process",
      tone: "soft",
      points: [
        [1070, 420],
        [1200, 520],
        [1280, 650],
      ],
    },
    {
      id: "process-now",
      tone: "amber",
      points: [
        [1908, 820],
        [2010, 700],
        [2090, 690],
      ],
    },
    {
      id: "process-status",
      tone: "soft",
      points: [
        [1528, 1080],
        [1528, 1160],
        [1528, 1250],
      ],
    },
  ];
};

export const createHomeBoardContent = (
  dynamic: HomeBoardDynamicContent,
  device: HomeBoardDevice,
): HomeBoardContent => {
  return {
    chrome: CHROME,
    device,
    screen: SCREEN_LAYOUTS[device],
    stage: STAGES[device],
    viewport: VIEWPORTS[device],
    items: createSharedItems(dynamic, device),
    connectors: createConnectors(device),
  };
};
