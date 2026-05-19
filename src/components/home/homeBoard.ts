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
    width: 2048,
    height: 1280,
    topbar: { x: 72, y: 56, w: 1904, h: 88 },
    sidebar: { x: 72, y: 168, w: 258, h: 1040 },
    boardPanel: { x: 354, y: 168, w: 1622, h: 1040 },
    boardViewport: { x: 372, y: 186, w: 1586, h: 928 },
  },
  mobile: {
    width: 1280,
    height: 2304,
    topbar: { x: 36, y: 36, w: 1208, h: 84 },
    boardPanel: { x: 36, y: 144, w: 1208, h: 2112 },
    boardViewport: { x: 64, y: 178, w: 1152, h: 1984 },
  },
};

const VIEWPORTS: Record<HomeBoardDevice, HomeBoardViewport> = {
  desktop: {
    width: 1520,
    height: 900,
    initialX: 110,
    initialY: 74,
    minX: -60,
    maxX: 480,
    minY: -40,
    maxY: 360,
  },
  mobile: {
    width: 920,
    height: 1780,
    initialX: 54,
    initialY: 48,
    minX: -20,
    maxX: 360,
    minY: 0,
    maxY: 880,
  },
};

const STAGE = { width: 1600, height: 1860 } as const;

const CHROME: HomeBoardChrome = {
  title: "echoes / endless notes",
  subtitle: "editing a personal canvas",
  pills: [
    { label: "draft", accent: true },
    { label: "drag to pan" },
    { label: "scroll to reveal room" },
  ],
  workspaceLabel: "workspace",
  workspaceTitle: "about lsy",
  sidebarItems: [
    { label: "个人信息板", active: true },
    { label: "项目与文章" },
    { label: "书影音记录" },
    { label: "长期兴趣" },
  ],
  routesLabel: "quick routes",
  routes: ["articles", "projects", "about", "books", "movies"],
  boardStatus: "drag the board, then scroll to pull the camera back",
  footer: "one board source, two windows into the same room",
};

const createSharedItems = (dynamic: HomeBoardDynamicContent): HomeBoardItem[] => [
  {
    id: "hero",
    kind: "hero",
    tone: "paper",
    x: 120,
    y: 120,
    w: 880,
    h: 330,
    eyebrow: "identity / editing",
    title: dynamic.title,
    subtitle: dynamic.subtitle,
    chips: ["infinite board", "personal notes", "3D room later"],
  },
  {
    id: "stack",
    kind: "card",
    tone: "paper",
    x: 1080,
    y: 136,
    w: 340,
    h: 196,
    rotate: -2.4,
    eyebrow: "profile block",
    value: dynamic.stack,
    body: ["把博客、工具与多 Agent 想法", "整理成一张持续生长的个人工作台。"],
    valueSize: "md",
  },
  {
    id: "contact",
    kind: "card",
    tone: "paper",
    x: 1110,
    y: 384,
    w: 320,
    h: 196,
    rotate: 1.8,
    eyebrow: "contact",
    value: dynamic.contact,
    body: ["开放合作、交流实现细节", "也欢迎继续往文章和项目页看。"],
    valueSize: "sm",
  },
  {
    id: "thread",
    kind: "card",
    tone: "accent",
    x: 520,
    y: 760,
    w: 920,
    h: 232,
    eyebrow: "current thread",
    value: `> ${dynamic.thread}`,
    body: ["首屏先像无边笔记编辑器。", "继续滚动时，才发现自己一直在看 3D 场景里的屏幕。"],
    valueSize: "md",
  },
  {
    id: "note",
    kind: "note",
    tone: "amber",
    x: 140,
    y: 560,
    w: 380,
    h: 212,
    rotate: -3.8,
    eyebrow: "note",
    value: "让首页像一张正在整理的个人资料板，而不是一页静态简历。",
    valueSize: "md",
  },
  {
    id: "now",
    kind: "note",
    tone: "paper",
    x: 560,
    y: 566,
    w: 250,
    h: 176,
    rotate: 2.4,
    eyebrow: "now",
    value: dynamic.now,
    valueSize: "sm",
    dynamic: "now",
  },
  {
    id: "articles",
    kind: "card",
    tone: "paper",
    x: 1000,
    y: 1090,
    w: 430,
    h: 210,
    rotate: 2.6,
    eyebrow: "articles",
    value: dynamic.postsLabel,
    body: ["持续记录实现、生活碎片", "以及慢慢成形的长期主题。"],
    valueSize: "md",
  },
  {
    id: "navigation",
    kind: "note",
    tone: "ghost",
    x: 140,
    y: 1110,
    w: 580,
    h: 180,
    rotate: -1.5,
    eyebrow: "navigation",
    value: "articles / projects",
    body: ["about / books / movies"],
    valueSize: "sm",
  },
];

const CONNECTORS: HomeBoardConnector[] = [
  {
    id: "hero-stack",
    tone: "ink",
    points: [
      [1000, 300],
      [1060, 260],
      [1160, 230],
    ],
  },
  {
    id: "hero-contact",
    tone: "soft",
    points: [
      [1010, 360],
      [1080, 430],
      [1140, 468],
    ],
  },
  {
    id: "note-thread",
    tone: "amber",
    points: [
      [520, 700],
      [620, 760],
      [780, 820],
    ],
  },
  {
    id: "thread-articles",
    tone: "soft",
    points: [
      [1140, 995],
      [1200, 1040],
      [1210, 1095],
    ],
  },
];

export const createHomeBoardContent = (
  dynamic: HomeBoardDynamicContent,
  device: HomeBoardDevice,
): HomeBoardContent => {
  return {
    chrome: CHROME,
    device,
    screen: SCREEN_LAYOUTS[device],
    stage: STAGE,
    viewport: VIEWPORTS[device],
    items: createSharedItems(dynamic),
    connectors: CONNECTORS,
  };
};
