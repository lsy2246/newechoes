export type HomeScreenStoryDevice = "desktop" | "mobile";
export type HomeScreenStoryTheme = "light" | "dark";

type StoryInput = {
  device: HomeScreenStoryDevice;
  theme: HomeScreenStoryTheme;
  progress: number;
  pixelRatio?: number;
  layoutPixelRatio?: number;
  revealCenterDiorama?: boolean;
  motion?: number;
  now: string;
  screenTitle: string;
  postsLabel: string;
  sources: {
    heading: string;
    subheading: string;
    cards: readonly {
      title: string;
      note: string;
    }[];
  };
  lanes: {
    heading: string;
    subheading: string;
    items: readonly {
      label: string;
      title: string;
      note: string;
    }[];
  };
  projects: {
    heading: string;
    subheading: string;
    items: readonly {
      label: string;
      title: string;
      note: string;
      details: readonly string[];
    }[];
  };
  current: {
    role: string;
    stack: string;
    summary: string;
    status: string;
    contact: string;
    panels: readonly {
      tag: string;
      title: string;
      note: string;
    }[];
  };
};

type StoryTrack = StoryInput["lanes"]["items"][number];
type StoryTodayPanel = StoryInput["current"]["panels"][number];
type StoryMaterial = {
  title: string;
  note: string;
  group: number;
  active: boolean;
  angle: number;
};
type StoryWorkRow = StoryInput["projects"]["items"][number] & {
  from: number;
  active: boolean;
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Palette = {
  bg: string;
  bg2: string;
  paper: string;
  paperStrong: string;
  soft: string;
  text: string;
  muted: string;
  quiet: string;
  accent: string;
  accentSoft: string;
  aiAccent: string;
  aiAccentSoft: string;
  aiLine: string;
  aiFlow: string;
  line: string;
  shadow: string;
};

const PALETTES: Record<HomeScreenStoryTheme, Palette> = {
  light: {
    bg: "#ffffff",
    bg2: "#ffffff",
    paper: "rgba(16, 16, 16, 0.018)",
    paperStrong: "rgba(16, 16, 16, 0.036)",
    soft: "rgba(16, 16, 16, 0.026)",
    text: "#101010",
    muted: "#3f3f3f",
    quiet: "#626262",
    accent: "#101010",
    accentSoft: "rgba(16, 16, 16, 0.06)",
    aiAccent: "#6f5fa6",
    aiAccentSoft: "rgba(111, 95, 166, 0.11)",
    aiLine: "rgba(111, 95, 166, 0.34)",
    aiFlow: "rgba(111, 95, 166, 0.58)",
    line: "#dedede",
    shadow: "rgba(16, 16, 16, 0.05)",
  },
  dark: {
    bg: "#111315",
    bg2: "#111315",
    paper: "rgba(245, 247, 250, 0.035)",
    paperStrong: "rgba(245, 247, 250, 0.062)",
    soft: "rgba(245, 247, 250, 0.048)",
    text: "#f5f7fa",
    muted: "#bdc5cf",
    quiet: "#8f9aa7",
    accent: "#eef2f6",
    accentSoft: "rgba(238, 242, 246, 0.1)",
    aiAccent: "#b8aadf",
    aiAccentSoft: "rgba(184, 170, 223, 0.15)",
    aiLine: "rgba(184, 170, 223, 0.36)",
    aiFlow: "rgba(184, 170, 223, 0.62)",
    line: "#30363d",
    shadow: "rgba(17, 19, 21, 0.32)",
  },
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
const ease = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const phase = (progress: number, start: number, end: number) => ease((progress - start) / Math.max(0.0001, end - start));
const fade = (progress: number, enter: number, stable: number, exit: number, gone: number) => {
  return phase(progress, enter, stable) * (1 - phase(progress, exit, gone));
};

const withAlpha = (ctx: CanvasRenderingContext2D, alpha: number, draw: () => void) => {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  draw();
  ctx.restore();
};

const rounded = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
  fill: string,
  stroke: string,
  shadow = "",
) => {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 18;
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();
  ctx.restore();
};

const drawLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  weight = 500,
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px 'JetBrains Mono', monospace`;
  ctx.fillText(text, x, y);
  ctx.restore();
};

const layoutFor = (device: HomeScreenStoryDevice, width: number, height: number) => {
  if (device === "mobile") {
    const pad = width * 0.075;
    const col = width - pad * 2;
    return {
      hero: { x: pad, y: height * 0.07, w: col, h: height * 0.14 },
      input: { x: pad, y: height * 0.265, w: col, h: height * 0.125 },
      process: { x: pad, y: height * 0.43, w: col, h: height * 0.13 },
      now: { x: pad, y: height * 0.615, w: col, h: height * 0.19 },
      status: { x: pad, y: height * 0.86, w: col, h: height * 0.085 },
    };
  }

  return {
    hero: { x: width * 0.072, y: height * 0.11, w: width * 0.285, h: height * 0.215 },
    input: { x: width * 0.072, y: height * 0.44, w: width * 0.245, h: height * 0.245 },
    process: { x: width * 0.374, y: height * 0.375, w: width * 0.257, h: height * 0.245 },
    now: { x: width * 0.68, y: height * 0.27, w: width * 0.245, h: height * 0.35 },
    status: { x: width * 0.37, y: height * 0.72, w: width * 0.26, h: height * 0.105 },
  };
};

const drawEditorialGuide = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  progress: number,
  width = ctx.canvas.width,
  height = ctx.canvas.height,
) => {
  const offset = progress * height * 0.018;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const mark = Math.min(width, height) * 0.042;
  ctx.save();
  ctx.strokeStyle = palette.line;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - mark * 2.8, centerY + mark * 2.2 - offset);
  ctx.lineTo(centerX - mark * 1.4, centerY + mark * 2.2 - offset);
  ctx.moveTo(centerX + mark * 1.4, centerY - mark * 2.2 + offset * 0.4);
  ctx.lineTo(centerX + mark * 2.8, centerY - mark * 2.2 + offset * 0.4);
  ctx.stroke();
  ctx.restore();
};

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  progress: number,
  width = ctx.canvas.width,
  height = ctx.canvas.height,
) => {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);
  drawEditorialGuide(ctx, palette, progress, width, height);
};

const drawCard = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  palette: Palette,
  eyebrow: string,
  title: string,
  lines: string[],
  accent = false,
) => {
  rounded(ctx, rect, Math.min(rect.h * 0.1, 34), accent ? palette.accentSoft : palette.paper, accent ? palette.line : "rgba(148, 163, 184, 0.16)", palette.shadow);
  const pad = Math.max(28, rect.w * 0.042);
  drawLabel(ctx, eyebrow, rect.x + pad, rect.y + pad + 8, palette.muted, Math.max(17, rect.w * 0.019), 700);
  ctx.save();
  ctx.fillStyle = palette.text;
  ctx.font = `600 ${Math.min(rect.h * 0.28, rect.w * 0.098)}px 'Fraunces', 'Noto Serif SC', serif`;
  ctx.fillText(title, rect.x + pad, rect.y + rect.h * 0.48);
  ctx.restore();
  lines.forEach((line, index) => {
    drawLabel(ctx, line, rect.x + pad, rect.y + rect.h * 0.68 + index * Math.max(30, rect.h * 0.11), palette.muted, Math.max(18, rect.w * 0.022), 600);
  });
};

const moveRect = (from: Rect, to: Rect, amount: number): Rect => ({
  x: lerp(from.x, to.x, amount),
  y: lerp(from.y, to.y, amount),
  w: lerp(from.w, to.w, amount),
  h: lerp(from.h, to.h, amount),
});

const drawMovedCard = (
  ctx: CanvasRenderingContext2D,
  from: Rect,
  to: Rect,
  amount: number,
  rotateFrom: number,
  rotateTo: number,
  draw: (rect: Rect) => void,
) => {
  const rect = moveRect(from, to, amount);
  const rotation = lerp(rotateFrom, rotateTo, amount);
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-rect.x - rect.w / 2, -rect.y - rect.h / 2);
  draw(rect);
  ctx.restore();
};

const drawConnector = (
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  progress: number,
  palette: Palette,
) => {
  if (points.length < 2 || progress <= 0.001) return;
  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = Math.max(3, ctx.canvas.width * 0.001);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = new Path2D();
  path.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    const midX = (prev[0] + next[0]) / 2;
    const midY = (prev[1] + next[1]) / 2;
    path.quadraticCurveTo(prev[0], prev[1], midX, midY);
  }
  const last = points[points.length - 1];
  path.lineTo(last[0], last[1]);
  const revealLength = Math.max(ctx.canvas.width, ctx.canvas.height) * 1.4;
  ctx.setLineDash([revealLength * clamp(progress), revealLength]);
  ctx.stroke(path);
  ctx.restore();
};

const introTone = (theme: HomeScreenStoryTheme) => ({
  bg: theme === "dark" ? "#111315" : "#ffffff",
  ink: theme === "dark" ? "#f5f7fa" : "#101010",
  muted: theme === "dark" ? "#bdc5cf" : "#3f3f3f",
  quiet: theme === "dark" ? "#8f9aa7" : "#626262",
  signal: theme === "dark" ? "#eef2f6" : "#101010",
});

const drawIntroCover = (
  ctx: CanvasRenderingContext2D,
  theme: HomeScreenStoryTheme,
  alpha: number,
  width = ctx.canvas.width,
  height = ctx.canvas.height,
) => {
  const tone = introTone(theme);
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = tone.bg;
    ctx.fillRect(0, 0, width, height);
  });
};

const drawIntro = (
  ctx: CanvasRenderingContext2D,
  input: StoryInput,
  progress: number,
  device: HomeScreenStoryDevice,
  theme: HomeScreenStoryTheme,
  width = ctx.canvas.width,
  height = ctx.canvas.height,
) => {
  const alpha = 1 - phase(progress, device === "mobile" ? 0.2 : 0.08, device === "mobile" ? 0.34 : 0.2);
  const settle = phase(progress, 0, device === "mobile" ? 0.24 : 0.18);
  const tone = introTone(theme);
  drawIntroCover(ctx, theme, alpha, width, height);

  withAlpha(ctx, alpha, () => {
    const titleY = height * (device === "mobile" ? 0.34 : 0.48) - settle * height * (device === "mobile" ? 0.035 : 0.05);
    const titleSize = device === "mobile" ? width * 0.25 : Math.min(width * 0.12, 184);

    ctx.save();
    ctx.translate(width / 2, titleY);
    ctx.fillStyle = tone.ink;
    ctx.textAlign = "center";
    ctx.font = `500 ${titleSize}px 'Fraunces', 'Noto Serif SC', serif`;
    ctx.fillText(input.screenTitle, 0, 0);
    ctx.restore();
  });
};

const drawMobileStory = (
  ctx: CanvasRenderingContext2D,
  input: StoryInput,
  palette: Palette,
  progress: number,
  width = ctx.canvas.width,
  height = ctx.canvas.height,
) => {
  const unit = Math.min(width / 390, height / 844);
  const safeTop = Math.max(height * 0.12, 118 * unit);
  const safeBottom = Math.max(height * 0.08, 72 * unit);
  const safeX = width * 0.085;
  const safeW = width - safeX * 2;
  const safeH = height - safeTop - safeBottom;
  const safe: Rect = { x: safeX, y: safeTop, w: safeW, h: safeH };
  const titleSize = clamp(width * 0.125, 140, 184);
  const bodySize = clamp(width * 0.045, 50, 68);
  const smallSize = clamp(width * 0.034, 38, 50);
  const mobileInputNumberW = 34 * unit;
  const mobileInputTitleMinSize = 9.2 * unit;
  const tracks = input.lanes.items;
  const materials: StoryMaterial[] = input.sources.cards.map((item, index) => ({
    ...item,
    group: Math.min(2, Math.floor(index / 2)),
    active: index === 3,
    angle: [-2.65, -1.55, 1.9, 0.85, -0.35, 2.75][index] ?? 0,
  }));
  const workRows: StoryWorkRow[] = input.projects.items.map((item, index) => ({
    ...item,
    from: 1,
    active: index === 1,
  }));
  const todayPanels = input.current.panels;

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = palette.text,
    font = "'JetBrains Mono', monospace",
    weight = 500,
  ) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillText(value, x, y);
    ctx.restore();
  };

  const measure = (value: string, size: number, font = "'JetBrains Mono', monospace", weight = 600) => {
    ctx.save();
    ctx.font = `${weight} ${size}px ${font}`;
    const result = ctx.measureText(value).width;
    ctx.restore();
    return result;
  };

  const wrapText = (
    value: string,
    maxWidth: number,
    size: number,
    font = "'JetBrains Mono', monospace",
    weight = 600,
    maxLines = 2,
  ) => {
    const words = value.split(" ");
    const lines: string[] = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (measure(next, size, font, weight) <= maxWidth || !current) {
        current = next;
        return;
      }
      lines.push(current);
      current = word;
    });
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  };

  const fitSize = (
    value: string,
    maxWidth: number,
    size: number,
    minSize: number,
    font = "'JetBrains Mono', monospace",
    weight = 600,
  ) => {
    let fitted = size;
    while (fitted > minSize && measure(value, fitted, font, weight) > maxWidth) {
      fitted -= 0.6 * unit;
    }
    return fitted;
  };

  const textFit = (
    value: string,
    x: number,
    y: number,
    size: number,
    maxWidth: number,
    color = palette.text,
    font = "'JetBrains Mono', monospace",
    weight = 600,
    minSize = size * 0.72,
  ) => {
    text(value, x, y, fitSize(value, maxWidth, size, minSize, font, weight), color, font, weight);
  };

  const clipRect = (rect: Rect, draw: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    draw();
    ctx.restore();
  };

  const activeInk = (active: boolean, aiSignal = false) => active ? (aiSignal ? palette.aiAccent : palette.accent) : palette.muted;

  const drawMobileRule = (x: number, y: number, w: number, active = false, aiSignal = false) => {
    const ruleColor = active ? activeInk(true, aiSignal) : palette.muted;

    ctx.save();
    ctx.strokeStyle = ruleColor;
    ctx.fillStyle = ruleColor;
    ctx.globalAlpha *= active ? 0.78 : 0.58;
    ctx.lineWidth = 1.35 * unit;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w + 10 * unit, y, 3.6 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const introHeroX = width * 0.5;
  const introHeroY = height * 0.49;
  const introHeroW = Math.min(width * 0.48, 210 * unit);
  const introHeroH = 142 * unit;
  const introFlowMotion = input.motion ?? progress;
  const introSlotGap = 18 * unit;
  const introSlotW = (safe.w - introSlotGap) / 2;
  const introSingleW = Math.min(safe.w * 0.48, introHeroW * 0.9);
  const introSlotH = 52 * unit;
  const introTopPairY = introHeroY - introHeroH * 1.45;
  const introTopSingleY = introHeroY - introHeroH * 0.9;
  const introBottomSingleY = introHeroY + introHeroH * 0.74;
  const introBottomPairY = introHeroY + introHeroH * 1.32;
  const introLabelRects = [
    { x: safe.x, y: introTopPairY, w: introSlotW, h: introSlotH },
    { x: safe.x + introSlotW + introSlotGap, y: introTopPairY + 16 * unit, w: introSlotW, h: introSlotH },
    { x: introHeroX - introSingleW / 2, y: introTopSingleY, w: introSingleW, h: introSlotH },
    { x: introHeroX - introSingleW / 2, y: introBottomSingleY, w: introSingleW, h: introSlotH },
    { x: safe.x, y: introBottomPairY, w: introSlotW, h: introSlotH },
    { x: safe.x + introSlotW + introSlotGap, y: introBottomPairY + 16 * unit, w: introSlotW, h: introSlotH },
  ];
  const mobileIntroSlots = introLabelRects.map((rect) => ({ ...rect }));

  const drawMobileChapterTitle = (chapter: string, amount: number, nextChapter = chapter, nextAmount = 0) => {
    const heroSize = width * 0.25;
    const titleFont = "'Fraunces', 'Noto Serif SC', serif";
    const startX = introHeroX - measure(input.screenTitle, heroSize, titleFont, 500) / 2;
    const startY = introHeroY;
    const endX = safe.x;
    const endY = safe.y;
    const titleXTravel = phase(amount, 0.02, 0.48);
    const titleYTravel = phase(amount, 0.24, 1);
    const titleSizeTravel = phase(amount, 0, 0.58);
    const size = lerp(heroSize, smallSize * 1.08, titleSizeTravel);
    const x = lerp(startX, endX, titleXTravel);
    const y = lerp(startY, endY, titleYTravel);
    const chapterSize = smallSize * 1.08;
    const label = ` / ${chapter}`;
    const nextLabel = ` / ${nextChapter}`;
    const labelX = x + measure(input.screenTitle, size, titleFont, 500) + 8 * unit;
    const labelReveal = phase(amount, 0.34, 0.72);
    const labelW = measure(label, chapterSize, "'JetBrains Mono', monospace", 700);
    const nextLabelW = measure(nextLabel, chapterSize, "'JetBrains Mono', monospace", 700);
    const handoff = nextChapter === chapter ? 0 : clamp(nextAmount);

    text(input.screenTitle, x, y, size, palette.text, titleFont, 500);
    if (handoff <= 0.001) {
      clipRect({ x: labelX, y: y - chapterSize * 1.2, w: labelW * labelReveal, h: chapterSize * 1.7 }, () => {
        text(label, labelX, y, chapterSize, palette.accent, "'JetBrains Mono', monospace", 700);
      });
      return;
    }

    const labelClipW = Math.max(labelW, nextLabelW) * labelReveal;
    const currentLabelAlpha = 1 - phase(handoff, 0.16, 0.5);
    const nextLabelAlpha = phase(handoff, 0.24, 0.58);

    clipRect({ x: labelX, y: y - chapterSize * 1.2, w: labelClipW, h: chapterSize * 1.7 }, () => {
      withAlpha(ctx, currentLabelAlpha, () => {
        text(label, labelX, y, chapterSize, palette.accent, "'JetBrains Mono', monospace", 700);
      });
      withAlpha(ctx, nextLabelAlpha, () => {
        text(nextLabel, labelX, y, chapterSize, palette.accent, "'JetBrains Mono', monospace", 700);
      });
    });
  };

  const drawMobileIntroRule = (rect: Rect, item: StoryMaterial, amount: number) => {
    const introRuleColor = item.active ? palette.aiAccent : palette.muted;
    const introRuleW = 60 * unit;
    const introRuleDotGap = 10 * unit;

    withAlpha(ctx, amount * 0.9, () => {
      ctx.save();
      ctx.strokeStyle = introRuleColor;
      ctx.fillStyle = introRuleColor;
      ctx.lineWidth = 1.35 * unit;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y + 2 * unit);
      ctx.lineTo(rect.x + introRuleW, rect.y + 2 * unit);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rect.x + introRuleW + introRuleDotGap, rect.y + 2 * unit, 3.2 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const drawMobileIntroFlow = (rect: Rect, item: StoryMaterial, toward: 1 | -1, amount: number, index: number) => {
    const introFlowGap = 10 * unit;
    const startX = rect.x + rect.w / 2;
    const introLabelTopY = rect.y + 2 * unit;
    const introLabelBottomY = rect.y + 39 * unit;
    const startY = toward === 1 ? introLabelBottomY + introFlowGap : introLabelTopY - introFlowGap;
    const targetY = toward === 1 ? introHeroY - introHeroH * 0.2 : introHeroY + introHeroH * 0.24;
    const targetX = introHeroX + (startX - introHeroX) * 0.16;
    const isCenterIntroFlow = index === 2 || index === 3;
    const side = Math.abs(startX - introHeroX) < 6 * unit ? index === 2 ? -1 : 1 : startX < introHeroX ? -1 : 1;
    const introFlowBend = side * (isCenterIntroFlow ? 18 * unit : 30 * unit);
    const firstControlX = startX + introFlowBend;
    const secondControlX = targetX + introFlowBend * 0.45;
    const travelY = targetY - startY;
    const flowColor = item.active ? palette.aiAccent : palette.muted;

    withAlpha(ctx, amount * (item.active ? 0.8 : 0.38), () => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const drawIntroFlowPath = () => {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(firstControlX, startY + travelY * 0.28, secondControlX, startY + travelY * 0.74, targetX, targetY);
      };

      ctx.strokeStyle = flowColor;
      ctx.globalAlpha *= item.active ? 0.5 : 0.34;
      ctx.lineWidth = item.active ? 1.5 * unit : 1.15 * unit;
      ctx.setLineDash([6 * unit, 10 * unit]);
      ctx.lineDashOffset = -introFlowMotion * 72 * unit;
      drawIntroFlowPath();
      ctx.stroke();

      ctx.strokeStyle = flowColor;
      ctx.globalAlpha *= item.active ? 0.78 : 0.42;
      ctx.lineWidth = item.active ? 2.05 * unit : 1.35 * unit;
      ctx.setLineDash([5 * unit, 16 * unit]);
      ctx.lineDashOffset = -introFlowMotion * 118 * unit;
      drawIntroFlowPath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    });
  };

  const drawMobileIntroMaterial = (rect: Rect, item: StoryMaterial, index: number, amount: number) => {
    const materialMorph = phase(amount, 0.16, 0.52);
    const flowAmount = 1 - phase(materialMorph, 0.18, 0.62);
    const numberAlpha = phase(materialMorph, 0.18, 0.52);
    const detailAmount = phase(materialMorph, 0.42, 0.88);
    const pad = lerp(0, 10 * unit, materialMorph);
    const ruleY = lerp(rect.y + 2 * unit, rect.y + 8 * unit, materialMorph);
    const ruleW = lerp(60 * unit, Math.min(rect.w * 0.34, 70 * unit), materialMorph);
    const ruleDotGap = 10 * unit;
    const ruleStroke = item.active ? palette.aiAccent : palette.muted;
    const ruleLineWidth = lerp(1.35 * unit, item.active ? 1.4 * unit : 1 * unit, materialMorph);
    const ruleDotRadius = lerp(3.2 * unit, item.active ? 3.8 * unit : 3.2 * unit, materialMorph);
    const numberW = lerp(0, mobileInputNumberW, numberAlpha);
    const titleSize = fitSize(item.title, rect.w - pad * 2 - numberW, lerp(13 * unit, bodySize * 0.72, materialMorph), mobileInputTitleMinSize, "'JetBrains Mono', monospace", 700);

    if (flowAmount > 0.01) {
      drawMobileIntroFlow(rect, item, index < 3 ? 1 : -1, flowAmount, index);
    }

    clipRect({ x: rect.x - 3 * unit, y: rect.y - 6 * unit, w: rect.w + 6 * unit, h: rect.h + 12 * unit }, () => {
      withAlpha(ctx, 1, () => {
        ctx.save();
        ctx.strokeStyle = ruleStroke;
        ctx.fillStyle = ruleStroke;
        ctx.lineCap = "round";
        ctx.lineWidth = ruleLineWidth;
        ctx.globalAlpha *= lerp(0.88, item.active ? 0.78 : 0.62, materialMorph);
        ctx.beginPath();
        ctx.moveTo(rect.x + pad, ruleY);
        ctx.lineTo(rect.x + pad + ruleW, ruleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rect.x + pad + ruleW + ruleDotGap, ruleY, ruleDotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (numberAlpha > 0.2) {
          text(String(index + 1).padStart(2, "0"), rect.x + pad, rect.y + 34 * unit, smallSize * 0.56, item.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
        }
        textFit(item.title, rect.x + pad + numberW, rect.y + lerp(32 * unit, 35 * unit, materialMorph), titleSize, rect.w - pad * 2 - numberW, item.active ? palette.aiAccent : palette.text, "'JetBrains Mono', monospace", 700, mobileInputTitleMinSize);
      });

      if (detailAmount > 0.01) {
        clipRect({ x: rect.x, y: rect.y + rect.h - 26 * unit, w: rect.w, h: 20 * unit * detailAmount }, () => {
          wrapText(item.note, mobileInputBodyWidth, smallSize * 0.56, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
            text(line, rect.x + pad, rect.y + rect.h - 14 * unit, smallSize * 0.56, palette.muted, "'JetBrains Mono', monospace", 600);
          });
        });
      }
    });
  };

  type MobileInputCard = {
    label: string;
    title: string;
    meta: string;
    active: boolean;
    group: 0 | 1 | 2;
  };

  const drawMobileEditorialInput = (
    rect: Rect,
    item: MobileInputCard,
    toMethod: number,
    index: number,
  ) => {
    const pad = lerp(10 * unit, 4 * unit, toMethod);
    const maxWidth = rect.w - pad * 2;
    const ruleW = lerp(Math.min(rect.w * 0.34, 70 * unit), 56 * unit, toMethod);
    const ruleColor = item.active ? palette.aiAccent : palette.muted;
    const indexText = String(index + 1).padStart(2, "0");
    const titleX = rect.x + pad + mobileInputNumberW;
    const titleMaxWidth = Math.max(1, maxWidth - mobileInputNumberW);
    const titleMinSize = mobileInputTitleMinSize;
    const titleSize = fitSize(
      item.title,
      titleMaxWidth,
      lerp(bodySize * 0.72, bodySize * 0.46, toMethod),
      titleMinSize,
      "'JetBrains Mono', monospace",
      700,
    );
    const metaAlpha = 1 - phase(toMethod, 0.18, 0.64);
    const clip: Rect = {
      x: rect.x - 8 * unit,
      y: rect.y - 12 * unit,
      w: rect.w + 16 * unit,
      h: rect.h + 24 * unit,
    };

    clipRect(clip, () => {
      ctx.save();
      ctx.strokeStyle = ruleColor;
      ctx.fillStyle = ruleColor;
      ctx.lineCap = "round";
      ctx.lineWidth = item.active ? 1.4 * unit : 1 * unit;
      ctx.globalAlpha *= item.active ? 0.78 : 0.62;
      ctx.beginPath();
      ctx.moveTo(rect.x + pad, rect.y + 8 * unit);
      ctx.lineTo(rect.x + pad + ruleW, rect.y + 8 * unit);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rect.x + pad + ruleW + 10 * unit, rect.y + 8 * unit, 3.8 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      text(indexText, rect.x + pad, rect.y + 34 * unit, smallSize * 0.56, item.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
      text(
        item.title,
        titleX,
        rect.y + 35 * unit,
        titleSize,
        item.active ? palette.aiAccent : palette.text,
        "'JetBrains Mono', monospace",
        700,
      );

      if (rect.h > 62 * unit && metaAlpha > 0.001) {
        const metaSize = smallSize * lerp(0.62, 0.54, toMethod);
        withAlpha(ctx, metaAlpha, () => {
          wrapText(item.meta, maxWidth, metaSize, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
            text(line, rect.x + pad, rect.y + rect.h - 14 * unit, metaSize, palette.muted, "'JetBrains Mono', monospace", 600);
          });
        });
      }
    });
  };

  const drawMobileClassifyTrack = (
    rect: Rect,
    track: StoryTrack,
    index: number,
    amount: number,
    textReveal = 1,
  ) => {
    const pad = 8 * unit;
    const maxWidth = rect.w - pad * 2;
    const revealH = rect.h * phase(amount, 0.02, 0.72);

    clipRect({ x: rect.x - 8 * unit, y: rect.y - 10 * unit, w: rect.w + 16 * unit, h: revealH + 20 * unit }, () => {
      drawMobileRule(rect.x + pad, rect.y + 8 * unit, rect.w * 0.28, index === 1, index === 1);
      withAlpha(ctx, textReveal, () => {
        text(String(index + 1).padStart(2, "0"), rect.x + pad, rect.y + 36 * unit, smallSize * 0.62, index === 1 ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
        textFit(track.label, rect.x + pad + 50 * unit, rect.y + 36 * unit, smallSize * 0.58, maxWidth - 50 * unit, index === 1 ? palette.aiAccent : palette.muted, "'JetBrains Mono', monospace", 700, smallSize * 0.48);
        textFit(track.title, rect.x + pad, rect.y + 79 * unit, bodySize * 0.64, maxWidth, index === 1 ? palette.aiAccent : palette.text, "'Fraunces', 'Noto Serif SC', serif", 600, bodySize * 0.48);
        wrapText(track.note, maxWidth, smallSize * 0.54, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
          text(line, rect.x + pad, rect.y + 108 * unit, smallSize * 0.54, palette.muted, "'JetBrains Mono', monospace", 600);
        });
      });
    });
  };

  type MobileClassifyMorphPair = {
    sourceRect: Rect;
    targetRect: Rect;
    item: MobileInputCard;
    material: StoryMaterial;
    index: number;
  };

  const drawMobileClassifyMorphGroup = (
    rect: Rect,
    track: StoryTrack,
    index: number,
    amount: number,
    pairs: MobileClassifyMorphPair[],
  ) => {
    const pad = 8 * unit;
    const maxWidth = rect.w - pad * 2;
    const pairTravel = phase(amount, 0.02, 0.56);
    const pairFusion = phase(amount, 0.28, 0.66);
    const titleExtract = phase(amount, 0.44, 0.82);
    const noteRewrite = phase(amount, 0.76, 1);
    const ruleBridgeAmount = fade(amount, 0.04, 0.24, 0.46, 0.68);
    const groupRuleAmount = phase(amount, 0.2, 0.64);
    const sourceIdentityAmount = 1 - phase(amount, 0.58, 0.86);
    const ruleY = rect.y + 8 * unit;
    const ruleColor = index === 1 ? palette.aiAccent : palette.muted;
    const finalNumberY = rect.y + 36 * unit;
    const finalTitleY = rect.y + 79 * unit;
    const gatheredPairs = pairs.map((pair) => {
      const travelRect = moveRect(pair.sourceRect, pair.targetRect, pairTravel);
      const sourceRect = {
        ...travelRect,
        w: lerp(pair.sourceRect.w, pair.targetRect.w, pairFusion),
        h: lerp(pair.sourceRect.h, pair.targetRect.h, pairFusion),
      };
      const pairPad = lerp(10 * unit, 4 * unit, pairFusion);
      const pairRuleW = lerp(Math.min(sourceRect.w * 0.34, 70 * unit), 56 * unit, pairFusion);
      const pairRuleColor = pair.item.active ? palette.aiAccent : palette.muted;
      const titleX = sourceRect.x + pairPad + mobileInputNumberW;
      const titleY = sourceRect.y + 35 * unit;
      const titleMaxWidth = Math.max(1, sourceRect.w - pairPad * 2 - mobileInputNumberW);
      const titleSize = fitSize(
        pair.item.title,
        titleMaxWidth,
        lerp(bodySize * 0.72, bodySize * 0.44, pairFusion),
        mobileInputTitleMinSize,
        "'JetBrains Mono', monospace",
        700,
      );

      return {
        pair,
        sourceRect,
        pairPad,
        pairRuleW,
        pairRuleColor,
        titleX,
        titleY,
        titleMaxWidth,
        titleSize,
      };
    });
    const firstHeaderX = gatheredPairs[0] ? gatheredPairs[0].sourceRect.x + gatheredPairs[0].pairPad : rect.x + pad;
    const firstHeaderY = gatheredPairs[0] ? gatheredPairs[0].sourceRect.y + 34 * unit : finalNumberY;
    const groupHeaderX = lerp(firstHeaderX, rect.x + pad, titleExtract);
    const groupHeaderY = lerp(firstHeaderY, finalNumberY, titleExtract);
    const groupTitleX = lerp(gatheredPairs[0]?.titleX ?? rect.x + pad, rect.x + pad, titleExtract);
    const groupTitleY = lerp(gatheredPairs[0]?.titleY ?? finalTitleY, finalTitleY, titleExtract);
    const groupTextWidth = maxWidth;
    const groupHeaderAmount = phase(amount, 0.52, 0.86);
    const groupNoteY = lerp(groupTitleY + 30 * unit, rect.y + 108 * unit, noteRewrite);
    const titleFont = "'Fraunces', 'Noto Serif SC', serif";
    const titleWords = track.title.split(" / ");
    const finalTitleSize = fitSize(track.title, maxWidth, bodySize * 0.64, bodySize * 0.48, titleFont, 600);
    const pairTitleFragments = gatheredPairs.map(({ pair, titleX, titleY, titleMaxWidth }, pairIndex) => {
      const compactTitle = titleWords[pairIndex] ?? pair.item.title.split(" ")[0] ?? pair.item.title;
      const compactWidth = measure(compactTitle, finalTitleSize, titleFont, 600);

      return {
        compactTitle,
        compactWidth,
        titleX,
        titleY,
        titleMaxWidth,
        color: pair.item.active ? palette.aiAccent : palette.text,
      };
    });
    const leftTitle = pairTitleFragments[0];
    const rightTitle = pairTitleFragments[1];
    const slashWidth = measure("/", finalTitleSize, titleFont, 600);
    const slashGap = 8 * unit;
    const slashX = groupTitleX + (leftTitle?.compactWidth ?? 0) + slashGap;
    const rightTitleTargetX = slashX + slashWidth + slashGap;
    const sourceTitleAmount = 1 - phase(titleExtract, 0.1, 0.5);
    const compactTitleAmount = phase(titleExtract, 0.18, 0.62);
    const slashAmount = phase(titleExtract, 0.38, 0.86);
    const drawRuleBridgePath = (sourceRect: Rect, pairPad: number, pairRuleW: number, active: boolean, pairIndex: number) => {
      if (ruleBridgeAmount <= 0.001) return;
      const startX = sourceRect.x + pairPad + pairRuleW + 10 * unit;
      const startY = sourceRect.y + 8 * unit;
      const groupRuleW = lerp(rect.w * 0.18, rect.w * 0.28, pairFusion);
      const endX = rect.x + pad + groupRuleW + 10 * unit;
      const endY = ruleY;
      const side = pairIndex % 2 === 0 ? -1 : 1;
      const controlX = (startX + endX) / 2 + side * 16 * unit;
      const controlY = (startY + endY) / 2 - 18 * unit;

      withAlpha(ctx, ruleBridgeAmount * (active ? 0.62 : 0.42), () => {
        ctx.save();
        ctx.strokeStyle = active ? palette.aiAccent : palette.muted;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = active ? 1.7 * unit : 1.35 * unit;
        ctx.setLineDash([5 * unit, 10 * unit]);
        ctx.lineDashOffset = -introFlowMotion * 92 * unit;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.restore();
      });
    };

    gatheredPairs.forEach(({ pair, sourceRect, pairPad, pairRuleW, pairRuleColor, titleX, titleY, titleMaxWidth, titleSize }) => {
      const metaAmount = (1 - phase(pairFusion, 0.46, 0.9)) * sourceIdentityAmount;

      if (sourceIdentityAmount > 0.001) {
        ctx.save();
        ctx.strokeStyle = pairRuleColor;
        ctx.fillStyle = pairRuleColor;
        ctx.lineCap = "round";
        ctx.lineWidth = pair.item.active ? 1.4 * unit : 1 * unit;
        ctx.globalAlpha *= (pair.item.active ? 0.78 : 0.62) * sourceIdentityAmount;
        ctx.beginPath();
        ctx.moveTo(sourceRect.x + pairPad, sourceRect.y + 8 * unit);
        ctx.lineTo(sourceRect.x + pairPad + pairRuleW, sourceRect.y + 8 * unit);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sourceRect.x + pairPad + pairRuleW + 10 * unit, sourceRect.y + 8 * unit, 3.8 * unit, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      drawRuleBridgePath(sourceRect, pairPad, pairRuleW, pair.item.active, pair.index);

      if (sourceIdentityAmount > 0.001) {
        withAlpha(ctx, sourceIdentityAmount, () => {
          clipRect({ x: sourceRect.x + pairPad, y: sourceRect.y + 14 * unit, w: sourceRect.w - pairPad * 2, h: sourceRect.h }, () => {
            text(String(pair.index + 1).padStart(2, "0"), sourceRect.x + pairPad, sourceRect.y + 34 * unit, smallSize * 0.56, pair.item.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
          });
        });
      }
      withAlpha(ctx, sourceTitleAmount * sourceIdentityAmount, () => {
        clipRect({ x: titleX, y: titleY - bodySize, w: titleMaxWidth, h: bodySize * 1.5 }, () => {
          text(pair.item.title, titleX, titleY, titleSize, pair.item.active ? palette.aiAccent : palette.text, "'JetBrains Mono', monospace", 700);
        });
      });

      if (sourceRect.h > 62 * unit && metaAmount > 0.001) {
        withAlpha(ctx, metaAmount, () => {
          const metaSize = smallSize * lerp(0.56, 0.54, pairFusion);
          wrapText(pair.item.meta, mobileInputBodyWidth, metaSize, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
            text(line, sourceRect.x + pairPad, sourceRect.y + sourceRect.h - 14 * unit, metaSize, palette.muted, "'JetBrains Mono', monospace", 600);
          });
        });
      }
    });

    withAlpha(ctx, groupRuleAmount, () => {
      ctx.save();
      ctx.strokeStyle = ruleColor;
      ctx.fillStyle = ruleColor;
      ctx.lineCap = "round";
      ctx.lineWidth = index === 1 ? 1.4 * unit : 1 * unit;
      ctx.globalAlpha *= index === 1 ? 0.78 : 0.62;
      ctx.beginPath();
      ctx.moveTo(rect.x + pad, ruleY);
      ctx.lineTo(rect.x + pad + lerp(rect.w * 0.18, rect.w * 0.28, pairFusion), ruleY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rect.x + pad + lerp(rect.w * 0.18, rect.w * 0.28, pairFusion) + 10 * unit, ruleY, 3.8 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    withAlpha(ctx, groupHeaderAmount, () => {
      clipRect({ x: groupHeaderX, y: groupHeaderY - bodySize, w: groupTextWidth, h: bodySize * 1.5 }, () => {
        text(String(index + 1).padStart(2, "0"), groupHeaderX, groupHeaderY, smallSize * 0.62, index === 1 ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
        textFit(track.label, groupHeaderX + 50 * unit, groupHeaderY, smallSize * 0.58, maxWidth - 50 * unit, index === 1 ? palette.aiAccent : palette.muted, "'JetBrains Mono', monospace", 700, smallSize * 0.48);
      });
    });
    clipRect({ x: groupTitleX, y: groupTitleY - bodySize, w: groupTextWidth, h: bodySize * 1.6 }, () => {
      if (leftTitle) {
        const leftX = lerp(leftTitle.titleX, groupTitleX, titleExtract);
        const leftY = lerp(leftTitle.titleY, groupTitleY, titleExtract);
        const leftClipW = lerp(leftTitle.titleMaxWidth, leftTitle.compactWidth, titleExtract);
        clipRect({ x: leftX, y: leftY - bodySize, w: leftClipW * compactTitleAmount, h: bodySize * 1.6 }, () => {
          text(leftTitle.compactTitle, leftX, leftY, finalTitleSize, leftTitle.color, titleFont, 600);
        });
      }
      if (rightTitle) {
        const rightX = lerp(rightTitle.titleX, rightTitleTargetX, titleExtract);
        const rightY = lerp(rightTitle.titleY, groupTitleY, titleExtract);
        const rightClipW = lerp(rightTitle.titleMaxWidth, rightTitle.compactWidth, titleExtract);
        clipRect({ x: rightX, y: rightY - bodySize, w: rightClipW * compactTitleAmount, h: bodySize * 1.6 }, () => {
          text(rightTitle.compactTitle, rightX, rightY, finalTitleSize, rightTitle.color, titleFont, 600);
        });
      }
      withAlpha(ctx, slashAmount, () => {
        text("/", slashX, groupTitleY, finalTitleSize, index === 1 ? palette.aiAccent : palette.text, titleFont, 600);
      });
    });
    withAlpha(ctx, noteRewrite, () => {
      wrapText(track.note, maxWidth, smallSize * 0.54, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
        text(line, groupTitleX, groupNoteY, smallSize * 0.54, palette.muted, "'JetBrains Mono', monospace", 600);
      });
    });
  };

  const drawMobileEditorialWork = (
    rect: Rect,
    row: StoryWorkRow,
    index: number,
    amount = 1,
    showSourceText = false,
    detailReveal = 1,
    textReveal = amount,
  ) => {
    const pad = lerp(7 * unit, 8 * unit, amount);
    const maxWidth = rect.w - pad * 2;
    const sourceTrack = tracks[row.from];
    const textAmount = showSourceText ? amount : textReveal;
    const sourceTextAlpha = showSourceText ? 1 - phase(amount, 0.14, 0.32) : 0;
    const workTextAlpha = showSourceText ? phase(amount, 0.24, 0.52) : phase(textAmount, 0.08, 0.42);
    const headerSourceAlpha = showSourceText ? 1 - phase(amount, 0.16, 0.34) : 0;
    const headerWorkAlpha = showSourceText ? phase(amount, 0.38, 0.58) : 0;
    const handoffHeaderAlpha = showSourceText ? fade(amount, 0.12, 0.18, 0.62, 0.78) : 0;
    const headerNumberAlpha = Math.max(headerSourceAlpha, headerWorkAlpha, handoffHeaderAlpha);
    const workTitleSize = bodySize * lerp(0.62, 0.68, amount);
    const workBodyY = Math.min(rect.y + 132 * unit, rect.y + rect.h - 16 * unit);
    const clip: Rect = {
      x: rect.x - 8 * unit,
      y: rect.y - 10 * unit,
      w: rect.w + 16 * unit,
      h: rect.h + 20 * unit,
    };

    clipRect(clip, () => {
      drawMobileRule(rect.x + pad, rect.y + 8 * unit, rect.w * 0.28, row.active, row.active);

      if (showSourceText && headerNumberAlpha > 0.001) {
        withAlpha(ctx, headerNumberAlpha, () => {
          text(String(row.from + 1).padStart(2, "0"), rect.x + pad, rect.y + 36 * unit, smallSize * 0.62, row.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
        });
        withAlpha(ctx, headerSourceAlpha, () => {
          textFit(sourceTrack.label, rect.x + pad + 50 * unit, rect.y + 36 * unit, smallSize * 0.58, maxWidth - 50 * unit, row.active ? palette.aiAccent : palette.muted, "'JetBrains Mono', monospace", 700, smallSize * 0.48);
        });
        withAlpha(ctx, headerWorkAlpha, () => {
          textFit(row.label, rect.x + pad + 50 * unit, rect.y + 36 * unit, smallSize * 0.58, maxWidth - 50 * unit, palette.muted, "'JetBrains Mono', monospace", 700, smallSize * 0.48);
        });
      }

      withAlpha(ctx, sourceTextAlpha, () => {
        textFit(sourceTrack.title, rect.x + pad, rect.y + 79 * unit, bodySize * 0.64, maxWidth, row.active ? palette.aiAccent : palette.text, "'Fraunces', 'Noto Serif SC', serif", 600, bodySize * 0.48);
        wrapText(sourceTrack.note, maxWidth, smallSize * 0.54, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
          text(line, rect.x + pad, rect.y + 108 * unit, smallSize * 0.54, palette.muted, "'JetBrains Mono', monospace", 600);
        });
      });

      withAlpha(ctx, workTextAlpha, () => {
        if (!showSourceText) {
          text(String(index + 1).padStart(2, "0"), rect.x + pad, rect.y + 36 * unit, smallSize * 0.62, row.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
          textFit(row.label, rect.x + pad + 50 * unit, rect.y + 36 * unit, smallSize * 0.58, maxWidth - 50 * unit, palette.muted, "'JetBrains Mono', monospace", 700, smallSize * 0.48);
        }
        textFit(row.title, rect.x + pad, rect.y + 79 * unit, workTitleSize, maxWidth, row.active ? palette.aiAccent : palette.text, "'Fraunces', 'Noto Serif SC', serif", 600, bodySize * 0.54);
        if (rect.h > 92 * unit) {
          clipRect({ x: rect.x, y: workBodyY - smallSize, w: rect.w, h: smallSize * 1.5 * detailReveal }, () => {
            wrapText(row.note, maxWidth, smallSize * 0.56, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
              text(line, rect.x + pad, workBodyY, smallSize * 0.56, palette.muted, "'JetBrains Mono', monospace", 600);
            });
          });
        }
        if (rect.h > 126 * unit) {
          clipRect({ x: rect.x, y: rect.y + rect.h - 32 * unit, w: rect.w, h: 24 * unit * detailReveal }, () => {
            row.details.slice(0, 1).forEach((detail) => {
              text(detail, rect.x + pad, rect.y + rect.h - 18 * unit, smallSize * 0.52, palette.quiet, "'JetBrains Mono', monospace", 600);
            });
          });
        }
      });
    });
  };

  const drawMobileClassifyToWorkMorph = (amount: number) => {
    const classifyHandoff = phase(amount, 0.08, 0.38);
    const sideFold = classifyHandoff;
    const sideFade = classifyHandoff;
    const sideMove = classifyHandoff;
    const centerRewrite = classifyHandoff;
    const splitAmount = phase(amount, 0.2, 0.78);
    const centerRect = moveRect(centerClassifyRect, workRects[1], amount);

    tracks.forEach((track, index) => {
      if (index === 1) return;
      if (sideFold >= 0.999 && sideFade >= 0.999) return;
      const sink = {
        x: centerClassifyRect.x + centerClassifyRect.w * 0.5,
        y: centerClassifyRect.y + centerClassifyRect.h * 0.5,
        w: 2 * unit,
        h: 2 * unit,
      };
      const trackRect = moveRect(mobileTrackRects[index], sink, sideMove);

      withAlpha(ctx, 1 - sideFade, () => {
        drawMobileClassifyMorphGroup(trackRect, track, index, 1, groupPairs[index]);
      });
    });

    workRows.forEach((row, index) => {
      if (index === 1) return;
      const rowSplit = phase(splitAmount, index === 0 ? 0.06 : 0.14, index === 0 ? 0.82 : 0.9);
      if (rowSplit <= 0.001) return;
      const sourceRect = centerRect;
      const rowRect = moveRect(sourceRect, workRects[index], rowSplit);
      const rowTextReveal = phase(rowSplit, 0.46, 0.84);

      drawMobileEditorialWork(rowRect, row, index, rowSplit, false, rowSplit, rowTextReveal);
    });

    drawMobileEditorialWork(centerRect, workRows[1], 1, centerRewrite, true, 1);
  };

  const drawMobileEditorialSnapshot = (rect: Rect, label: string, title: string, body: string, active = false) => {
    const pad = 6 * unit;
    const maxWidth = rect.w - pad * 2;
    const clip: Rect = {
      x: rect.x - 6 * unit,
      y: rect.y - 8 * unit,
      w: rect.w + 12 * unit,
      h: rect.h + 16 * unit,
    };

    clipRect(clip, () => {
      drawMobileRule(rect.x + pad, rect.y + 4 * unit, rect.w * 0.24, active);
      text(label, rect.x + pad, rect.y + 25 * unit, smallSize * 0.62, active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      const titleSize = fitSize(title, maxWidth, bodySize * 0.6, bodySize * 0.42, "'Fraunces', 'Noto Serif SC', serif", 600);
      wrapText(title, maxWidth, titleSize, "'Fraunces', 'Noto Serif SC', serif", 600, 1).forEach((line) => {
        text(line, rect.x + pad, rect.y + 48 * unit, titleSize, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      });
      if (rect.h > 70 * unit) {
        wrapText(body, maxWidth, smallSize * 0.56, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
          text(line, rect.x + pad, rect.y + rect.h - 12 * unit, smallSize * 0.56, palette.muted, "'JetBrains Mono', monospace", 600);
        });
      }
    });
  };

  const gap = 18 * unit;
  const cardW = (safe.w - gap) / 2;
  const mobileInputBodyWidth = cardW - 20 * unit;
  const cardH = clamp(safe.h * 0.13, 78 * unit, 96 * unit);
  const inputCards = materials.map((item) => ({
    label: tracks[item.group].label,
    title: item.title,
    meta: item.note,
    active: item.active,
    group: item.group,
  }));
  const inputRects = inputCards.map((_, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: safe.x + col * (cardW + gap),
      y: safe.y + 52 * unit + row * (cardH + gap * 0.72),
      w: cardW,
      h: cardH,
    };
  });

  const mobileTrackGap = 16 * unit;
  const mobileTrackH = Math.min(clamp(safe.h * 0.16, 112 * unit, 132 * unit), (safe.h - 124 * unit - mobileTrackGap * 2) / 3);
  const mobileTrackRects = tracks.map((_, index) => ({
    x: safe.x + 2 * unit,
    y: safe.y + 78 * unit + index * (mobileTrackH + mobileTrackGap),
    w: safe.w - 4 * unit,
    h: mobileTrackH,
  }));
  const mobileClassifyMaterialSlots = materials.map((item, index) => {
    const track = mobileTrackRects[item.group];
    const pairIndexes = materials.map((candidate, candidateIndex) => (candidate.group === item.group ? candidateIndex : -1)).filter((candidateIndex) => candidateIndex >= 0);
    const pairIndex = Math.max(0, pairIndexes.indexOf(index));
    const slotGap = 10 * unit;
    const slotW = (track.w - slotGap - 16 * unit) / 2;
    const slotH = Math.min(54 * unit, Math.max(44 * unit, track.h * 0.42));

    return {
      x: track.x + 8 * unit + pairIndex * (slotW + slotGap),
      y: track.y + track.h - slotH - 8 * unit,
      w: slotW,
      h: slotH,
    };
  });
  const workGapY = 16 * unit;
  const rowH = Math.min(clamp(safe.h * 0.185, 126 * unit, 152 * unit), (safe.h - 112 * unit - workGapY * 2) / 3);
  const workRects = workRows.map((_, index) => ({
    x: safe.x + 2 * unit,
    y: safe.y + 76 * unit + index * (rowH + workGapY),
    w: safe.w - 4 * unit,
    h: rowH,
  }));
  const todayRect = {
    x: safe.x,
    y: safe.y + safe.h * 0.055,
    w: safe.w,
    h: safe.h * 0.84,
  };
  const todayPad = 26 * unit;
  const todayTop = todayRect.y + todayPad;
  const todayStatusTop = todayRect.y + todayRect.h - 52 * unit;
  const todayHeroNameY = todayTop + 90 * unit;
  const todayHeroRoleY = todayHeroNameY + 52 * unit;
  const todayHeroSummaryY = todayHeroRoleY + 32 * unit;
  const todayHeroSummarySize = smallSize * 0.54;
  const todayBuildTop = Math.min(todayTop + 242 * unit, todayStatusTop - 220 * unit);
  const todayBuildRowsTop = todayBuildTop + 39 * unit;
  const todayBuildRowGap = 22 * unit;
  const todayBuildH = todayBuildRowsTop - todayBuildTop + todayBuildRowGap * (workRows.length - 1) + 16 * unit;
  const todayPanelGap = 14 * unit;
  const todayPanelTop = todayBuildTop + todayBuildH + 35 * unit;
  const todayPanelW = (todayRect.w - todayPad * 2 - todayPanelGap) / 2;
  const todayPanelH = Math.min(84 * unit, Math.max(58 * unit, todayStatusTop - todayPanelTop - 20 * unit));
  const todayPanelRects = todayPanels.slice(1).map((_, index) => ({
    x: todayRect.x + todayPad + index * (todayPanelW + todayPanelGap),
    y: todayPanelTop,
    w: todayPanelW,
    h: todayPanelH,
  }));
  const mobileBuildIndexRects = workRows.map((_, index) => ({
    x: todayRect.x + todayPad + 2 * unit,
    y: todayBuildRowsTop + index * todayBuildRowGap,
    w: todayRect.w - todayPad * 2 - 4 * unit,
    h: 14 * unit,
  }));

  const drawMobileBuildIndexRow = (
    rect: Rect,
    row: (typeof workRows)[number],
    index: number,
    amount: number,
  ) => {
    const pad = lerp(8 * unit, 0, amount);
    const baseline = rect.y + lerp(36 * unit, 10 * unit, amount);
    const numberW = lerp(50 * unit, 28 * unit, amount);
    const ruleW = lerp(rect.w * 0.28, rect.w * 0.22, amount);
    const ruleY = rect.y + lerp(8 * unit, 1 * unit, amount);
    const compactRuleAlpha = 1 - phase(amount, 0.72, 0.98);
    const title = amount < 0.48 ? row.title : `${String(index + 1).padStart(2, "0")} ${row.title}`;
    const fullDetailsAlpha = 1 - phase(amount, 0.24, 0.52);
    const compactTitleAlpha = phase(amount, 0.38, 0.66);
    const bodyY = Math.min(rect.y + 132 * unit, rect.y + rect.h - 16 * unit);

    clipRect({ x: rect.x - 4 * unit, y: rect.y - 5 * unit, w: rect.w + 8 * unit, h: rect.h + 48 * unit }, () => {
      withAlpha(ctx, compactRuleAlpha, () => {
        drawMobileRule(rect.x + pad, ruleY, ruleW, row.active, row.active);
      });
      withAlpha(ctx, fullDetailsAlpha, () => {
        text(String(index + 1).padStart(2, "0"), rect.x + pad, baseline, smallSize * 0.62, row.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
        textFit(row.label, rect.x + pad + numberW, baseline, smallSize * 0.58, rect.w - numberW, row.active ? palette.aiAccent : palette.muted, "'JetBrains Mono', monospace", 700, smallSize * 0.46);
        textFit(row.title, rect.x + pad, rect.y + 79 * unit, bodySize * 0.68, rect.w - pad * 2, row.active ? palette.aiAccent : palette.text, "'Fraunces', 'Noto Serif SC', serif", 600, bodySize * 0.54);
        if (rect.h > 92 * unit) {
          wrapText(row.note, rect.w - pad * 2, smallSize * 0.56, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
            text(line, rect.x + pad, bodyY, smallSize * 0.56, palette.muted, "'JetBrains Mono', monospace", 600);
          });
        }
      });
      withAlpha(ctx, compactTitleAlpha, () => {
        textFit(title, rect.x + pad, baseline, smallSize * 0.52, rect.w - pad * 2, row.active ? palette.aiAccent : palette.text, "'JetBrains Mono', monospace", 700, smallSize * 0.42);
      });
    });
  };

  const drawMobileTodayBuildHeading = (amount: number) => {
    const reveal = phase(amount, 0.12, 0.38);
    clipRect({ x: todayRect.x + todayPad, y: todayBuildTop - 24 * unit, w: todayRect.w - todayPad * 2, h: 40 * unit * reveal }, () => {
      drawMobileRule(todayRect.x + todayPad, todayBuildTop - 14 * unit, 96 * unit, true, true);
      text(input.current.panels[0]?.tag ?? "", todayRect.x + todayPad, todayBuildTop + 6 * unit, smallSize * 0.62, palette.muted, "'JetBrains Mono', monospace", 700);
    });
  };

  const drawMobileTodayFrame = (rect: Rect, amount: number) => {
    clipRect(rect, () => {
      const revealH = rect.h * phase(amount, 0.04, 0.42);
      clipRect({ x: rect.x, y: rect.y, w: rect.w, h: revealH }, () => {
        text(input.screenTitle, rect.x + todayPad, todayHeroNameY, titleSize * 0.82, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
        textFit(input.current.role, rect.x + todayPad, todayHeroRoleY, smallSize * 0.62, rect.w - todayPad * 2, palette.text, "'JetBrains Mono', monospace", 700, smallSize * 0.46);
        wrapText(input.current.summary, rect.w - todayPad * 2, todayHeroSummarySize, "'JetBrains Mono', monospace", 600, 2).forEach((line, lineIndex) => {
          text(line, rect.x + todayPad, todayHeroSummaryY + lineIndex * 19 * unit, todayHeroSummarySize, palette.muted, "'JetBrains Mono', monospace", 600);
        });
      });

      const statusReveal = phase(amount, 0.36, 0.82);
      clipRect({ x: rect.x, y: todayStatusTop - 14 * unit, w: rect.w, h: 76 * unit * statusReveal }, () => {
        drawMobileRule(rect.x + todayPad, todayStatusTop - 7 * unit, rect.w - todayPad * 2);
        textFit(input.current.status, rect.x + todayPad, todayStatusTop + 24 * unit, smallSize * 0.56, rect.w - todayPad * 2, palette.text, "'JetBrains Mono', monospace", 700, smallSize * 0.38);
        textFit(input.current.contact, rect.x + todayPad, todayStatusTop + 50 * unit, smallSize * 0.52, rect.w - todayPad * 2, palette.muted, "'JetBrains Mono', monospace", 600, smallSize * 0.38);
      });
    });
  };

  const drawMobileTodayPanel = (
    rect: Rect,
    panel: StoryTodayPanel,
    index: number,
    amount: number,
  ) => {
    const panelReveal = phase(amount, 0.22 + index * 0.06, 0.56 + index * 0.06);
    const pad = 6 * unit;
    const maxWidth = rect.w - pad * 2;
    const panelTitleSize = fitSize(panel.title, maxWidth, smallSize * 0.54, smallSize * 0.34, "'JetBrains Mono', monospace", 700);
    const compactTitleLines = panel.title.includes(" · ") && measure(panel.title, panelTitleSize, "'JetBrains Mono', monospace", 700) > maxWidth
      ? panel.title.split(" · ")
      : wrapText(panel.title, maxWidth, panelTitleSize, "'JetBrains Mono', monospace", 700, 3);
    const titleLines = compactTitleLines.slice(0, 3);
    const panelTitleY = rect.y + 49 * unit;
    const panelLineGap = titleLines.length > 2 ? 13 * unit : 16 * unit;

    clipRect({ x: rect.x, y: rect.y, w: rect.w, h: rect.h * panelReveal }, () => {
      drawMobileRule(rect.x + pad, rect.y + 5 * unit, rect.w * 0.34, index === 0);
      text(panel.tag, rect.x + pad, rect.y + 27 * unit, smallSize * 0.6, index === 0 ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      titleLines.forEach((line, lineIndex) => {
        text(line, rect.x + pad, panelTitleY + lineIndex * panelLineGap, panelTitleSize, palette.text, "'JetBrains Mono', monospace", 700);
      });
    });
  };

  const introToInput = phase(progress, 0.12, 0.38);
  const titleMorph = phase(progress, 0.14, 0.36);
  const inputToClassify = clamp((progress - 0.36) / 0.2);
  const makingFocus = clamp((progress - 0.58) / 0.34);
  const classifyToWork = makingFocus;
  const centerClassifyRect = mobileTrackRects[1];
  const buildBridge = phase(progress, 0.84, 0.92);
  const buildBridgeActive = buildBridge > 0.001;
  const todayMorph = phase(progress, 0.88, 0.98);
  const inputChapterHandoff = phase(inputToClassify, 0.66, 0.94);
  const workChapterHandoff = phase(classifyToWork, 0.18, 0.58);
  const chapter = inputToClassify < 0.94 ? "input" : todayMorph < 0.08 ? classifyToWork < 0.9 ? "classify" : "work" : "today";
  const nextChapter = chapter === "input" ? "classify" : chapter === "classify" && classifyToWork > 0.08 ? "work" : chapter;
  const chapterHandoff = chapter === "input" ? inputChapterHandoff : chapter === "classify" ? workChapterHandoff : 0;
  const groupPairs = tracks.map((_, group) =>
    materials.map((item, index) => {
      if (item.group !== group) return null;
      const pair: MobileClassifyMorphPair = {
        sourceRect: moveRect(mobileIntroSlots[index], inputRects[index], introToInput),
        targetRect: mobileClassifyMaterialSlots[index],
        item: inputCards[index],
        material: item,
        index,
      };
      return pair;
    }).filter((pair): pair is MobileClassifyMorphPair => pair !== null)
  );

  if (progress < 0.36) {
    materials.forEach((item, index) => {
      const rect = moveRect(mobileIntroSlots[index], inputRects[index], introToInput);
      drawMobileIntroMaterial(rect, item, index, introToInput);
    });
  } else if (!buildBridgeActive) {
    if (classifyToWork > 0.001) {
      drawMobileClassifyToWorkMorph(classifyToWork);
    } else {
      tracks.forEach((track, index) => {
        const trackRect = mobileTrackRects[index];
        drawMobileClassifyMorphGroup(trackRect, track, index, inputToClassify, groupPairs[index]);
      });
    }
  }

  if (buildBridge > 0.001) {
    workRows.forEach((row, index) => {
      const rect = moveRect(workRects[index], mobileBuildIndexRects[index], buildBridge);
      drawMobileBuildIndexRow(rect, row, index, buildBridge);
    });
  }

  if (progress >= 0.84) {
    drawMobileTodayFrame(todayRect, todayMorph);
    drawMobileTodayBuildHeading(todayMorph);
    todayPanels.slice(1).forEach((panel, index) => {
      const panelIndex = index + 1;
      const sourceRect = mobileBuildIndexRects[Math.min(panelIndex, mobileBuildIndexRects.length - 1)];
      const panelRect = moveRect(sourceRect, todayPanelRects[index], phase(todayMorph, 0.12 + index * 0.08, 0.68 + index * 0.08));
      drawMobileTodayPanel(panelRect, panel, index, todayMorph);
    });
  }

  drawMobileChapterTitle(chapter, titleMorph, nextChapter, chapterHandoff);

};

const drawDesktopStory = (
  ctx: CanvasRenderingContext2D,
  input: StoryInput,
  palette: Palette,
  progress: number,
  width = ctx.canvas.width,
  height = ctx.canvas.height,
) => {
  const unit = clamp(Math.min(width / 1280, height / 760), 0.88, 1.2);
  const safeX = Math.max(180 * unit, width * 0.135);
  const tracks = input.lanes.items;
  const materials: StoryMaterial[] = input.sources.cards.map((item, index) => ({
    ...item,
    group: Math.min(2, Math.floor(index / 2)),
    active: index === 3,
    angle: [-2.65, -1.55, 1.9, 0.85, -0.35, 2.75][index] ?? 0,
  }));
  const workRows: StoryWorkRow[] = input.projects.items.map((item, index) => ({
    ...item,
    from: 1,
    active: index === 1,
  }));
  const todayPanels = input.current.panels;
  const safeRight = width - safeX;
  const safeW = safeRight - safeX;
  const stageW = Math.min(safeW, height * 1.62);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const stageX = centerX - stageW * 0.5;
  const dioramaMode = input.revealCenterDiorama === true;
  const dioramaHandoff = dioramaMode ? phase(progress, 0.08, 0.24) : 1;
  const dioramaPresence = 1 - dioramaHandoff;
  const dioramaTitleX = centerX + stageW * 0.015;
  const dioramaTitleY = centerY + 24 * unit;
  const dioramaCoreX = dioramaTitleX;
  const dioramaCoreY = centerY - 12 * unit;
  const dioramaFocusGuardX = clamp(stageW * 0.15, 158 * unit, 220 * unit);
  const dioramaFocusGuardY = clamp(height * 0.125, 104 * unit, 154 * unit);
  const connector = palette.aiLine;
  const connectorFlow = palette.aiFlow;
  const materialRuleColor = input.theme === "dark" ? "rgba(159, 154, 159, 0.3)" : "rgba(5, 5, 5, 0.2)";
  const materialRuleActiveColor = palette.aiAccent;
  const connectorMotion = input.motion ?? 0;

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = palette.text,
    font = "'JetBrains Mono', monospace",
    weight = 500,
  ) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillText(value, x, y);
    ctx.restore();
  };

  const measure = (value: string, size: number, font = "'JetBrains Mono', monospace", weight = 700) => {
    ctx.save();
    ctx.font = `${weight} ${size}px ${font}`;
    const result = ctx.measureText(value).width;
    ctx.restore();
    return result;
  };

  const wrapText = (
    value: string,
    maxWidth: number,
    size: number,
    font = "'JetBrains Mono', monospace",
    weight = 600,
    maxLines = 2,
  ) => {
    const words = value.split(" ");
    const lines: string[] = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (measure(next, size, font, weight) <= maxWidth || !current) {
        current = next;
        return;
      }
      lines.push(current);
      current = word;
    });
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  };

  const fitSize = (
    value: string,
    maxWidth: number,
    size: number,
    minSize: number,
    font = "'JetBrains Mono', monospace",
    weight = 600,
  ) => {
    let fitted = size;
    while (fitted > minSize && measure(value, fitted, font, weight) > maxWidth) {
      fitted -= 0.7 * unit;
    }
    return fitted;
  };

  const textFit = (
    value: string,
    x: number,
    y: number,
    size: number,
    maxWidth: number,
    color = palette.text,
    font = "'JetBrains Mono', monospace",
    weight = 600,
    minSize = size * 0.7,
  ) => {
    text(value, x, y, fitSize(value, maxWidth, size, minSize, font, weight), color, font, weight);
  };

  const clipRect = (rect: Rect, draw: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    draw();
    ctx.restore();
  };

  const activeInk = (active: boolean, aiSignal = false) => active ? (aiSignal ? palette.aiAccent : palette.accent) : palette.muted;

  const drawEditorialRule = (x: number, y: number, w: number, active = false, aiSignal = false) => {
    ctx.save();
    ctx.strokeStyle = active ? activeInk(true, aiSignal) : palette.line;
    ctx.globalAlpha *= active ? 0.78 : 0.58;
    ctx.lineWidth = active ? 1.5 * unit : 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.restore();
  };

  const drawEditorialDot = (x: number, y: number, active = false, aiSignal = false) => {
    ctx.save();
    ctx.fillStyle = active ? activeInk(true, aiSignal) : palette.line;
    ctx.globalAlpha *= active ? 0.92 : 0.56;
    ctx.beginPath();
    ctx.arc(x, y, active ? 3.8 * unit : 2.8 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawMaterialRule = (x: number, y: number, w: number, active = false) => {
    ctx.save();
    ctx.strokeStyle = active ? materialRuleActiveColor : materialRuleColor;
    ctx.fillStyle = active ? materialRuleActiveColor : materialRuleColor;
    ctx.globalAlpha *= active ? 0.94 : 0.82;
    ctx.lineWidth = 1.75 * unit;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w + 16 * unit, y, 4 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const stageHeader = (label: string, title: string, alpha: number, y = height * 0.265, x = stageX) => {
    withAlpha(ctx, alpha, () => {
      text(label, x, y, 29 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
      drawEditorialRule(x, y + 18 * unit, Math.min(156 * unit, (safeRight - x) * 0.28), true);
      const titleFont = "'Fraunces', 'Noto Serif SC', serif";
      const titleSize = Math.min(48 * unit, ((safeRight - x) * 0.96) / Math.max(1, measure(title, 1, titleFont, 600)));
      text(title, x, y + 58 * unit, titleSize, palette.text, titleFont, 600);
    });
  };

  const curvedConnector = (fromX: number, fromY: number, toX: number, toY: number, alpha: number) => {
    withAlpha(ctx, alpha, () => {
      ctx.save();
      const midX = (fromX + toX) / 2;
      const verticalDirection = toY < dioramaCoreY ? -1 : 1;
      const horizontalArc = clamp(Math.abs(toX - fromX) * 0.08, 18 * unit, 46 * unit);
      const bend = (toY - fromY) * 0.24 + verticalDirection * horizontalArc;

      const drawConnectorPath = () => {
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(midX, fromY + bend, midX, toY - bend, toX, toY);
      };

      ctx.strokeStyle = connector;
      ctx.globalAlpha *= input.theme === "dark" ? 0.9 : 0.78;
      ctx.lineWidth = 2 * unit;
      ctx.lineCap = "round";
      ctx.setLineDash([8 * unit, 8 * unit]);
      ctx.lineDashOffset = connectorMotion * 42 * unit;
      drawConnectorPath();
      ctx.stroke();

      ctx.strokeStyle = connectorFlow;
      ctx.globalAlpha *= input.theme === "dark" ? 0.56 : 0.5;
      ctx.lineWidth = 2.35 * unit;
      ctx.setLineDash([3 * unit, 25 * unit]);
      ctx.lineDashOffset = connectorMotion * 92 * unit;
      drawConnectorPath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    });
  };

  const materialLabelLayout = (rect: Rect, item: StoryMaterial, compact: number) => {
    const pad = lerp(18 * unit, 8 * unit, compact);
    const numberAlpha = phase(compact, 0.16, 0.48);
    const titleOffset = lerp(0, 36 * unit, numberAlpha);
    const titleMaxW = rect.w - pad * 2 - titleOffset;
    const titleSize = fitSize(item.title, titleMaxW, lerp(24 * unit, 18 * unit, compact), 12 * unit, "'JetBrains Mono', monospace", 700);
    const titleWidth = measure(item.title, titleSize, "'JetBrains Mono', monospace", 700);
    const titleX = compact > 0.58 ? rect.x + titleOffset + (titleMaxW - titleWidth) / 2 : rect.x + pad + titleOffset;
    const compactTitleY = rect.y + rect.h * 0.64;
    const titleY = compact > 0.58 ? compactTitleY : rect.y + 40 * unit;
    const numberY = titleY;
    const materialRuleW = 104 * unit;
    const dotPadding = 18 * unit;
    const ruleX = titleX;
    const ruleY = titleY - 24 * unit;
    const connectorGap = 30 * unit;
    const labelLeft = Math.min(titleX, ruleX);
    const labelRight = Math.max(titleX + titleWidth, ruleX + materialRuleW + dotPadding);
    const labelCenterY = (ruleY + titleY) / 2;

    return {
      pad,
      numberAlpha,
      titleOffset,
      titleMaxW,
      titleSize,
      titleWidth,
      titleX,
      titleY,
      numberY,
      ruleX,
      ruleY,
      ruleW: materialRuleW,
      connectorGap,
      labelLeft,
      labelRight,
      labelCenterY,
    };
  };

  const materialAnchor = (rect: Rect, item: StoryMaterial, compact: number) => {
    const layout = materialLabelLayout(rect, item, compact);
    const materialCenterX = (layout.labelLeft + layout.labelRight) / 2;
    const materialCenterY = layout.labelCenterY;
    const relationHubX = lerp(dioramaCoreX, centerX, dioramaHandoff);
    const relationHubY = lerp(dioramaCoreY, centerY, dioramaHandoff);
    const dx = materialCenterX - relationHubX;
    const dy = materialCenterY - relationHubY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / distance;
    const ny = dy / distance;
    const centerGuard = clamp(height * 0.145, 104 * unit, 142 * unit);
    const normalFromX = centerX + nx * centerGuard;
    const normalFromY = centerY + ny * centerGuard * 0.58;
    const dioramaFromX = dioramaCoreX + nx * dioramaFocusGuardX;
    const dioramaFromY = dioramaCoreY + ny * dioramaFocusGuardY;
    const fromX = lerp(dioramaFromX, normalFromX, dioramaHandoff);
    const fromY = lerp(dioramaFromY, normalFromY, dioramaHandoff);

    return {
      fromX,
      fromY,
      toX: nx >= 0 ? layout.labelLeft - layout.connectorGap : layout.labelRight + layout.connectorGap,
      toY: layout.labelCenterY,
    };
  };

  const mindOffsets = [
    { x: -stageW * 0.3, y: -height * 0.16 },
    { x: stageW * 0.31, y: -height * 0.17 },
    { x: -stageW * 0.28, y: height * 0.09 },
    { x: stageW * 0.33, y: height * 0.07 },
    { x: -stageW * 0.26, y: height * 0.25 },
    { x: stageW * 0.28, y: height * 0.24 },
  ];
  const dioramaMindOffsets = [
    { x: -stageW * 0.28, y: -height * 0.15 },
    { x: stageW * 0.3, y: -height * 0.16 },
    { x: -stageW * 0.27, y: height * 0.08 },
    { x: stageW * 0.32, y: height * 0.04 },
    { x: -stageW * 0.25, y: height * 0.22 },
    { x: stageW * 0.28, y: height * 0.21 },
  ];

  const inputCardW = stageW * 0.34;
  const inputCardH = 112 * unit;
  const inputGapX = stageW * 0.075;
  const inputGapY = 26 * unit;
  const inputTop = centerY - 126 * unit;
  const inputAreaW = inputCardW * 2 + inputGapX;
  const inputAreaX = centerX - inputAreaW / 2;
  const inputRects = materials.map((_, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: inputAreaX + col * (inputCardW + inputGapX),
      y: inputTop + row * (inputCardH + inputGapY),
      w: inputCardW,
      h: inputCardH,
    };
  });

  const trackGap = stageW * 0.035;
  const trackAreaW = stageW * 0.9;
  const trackX = centerX - trackAreaW / 2;
  const trackW = (trackAreaW - trackGap * 2) / 3;
  const trackH = 230 * unit;
  const trackY = centerY - 118 * unit;
  const trackRects = tracks.map((_, index) => ({
    x: trackX + index * (trackW + trackGap),
    y: trackY,
    w: trackW,
    h: trackH,
  }));

  const groupOrders = [0, 0, 1, 1, 2, 2];
  const trackSlot = (index: number): Rect => {
    const track = trackRects[groupOrders[index]];
    const pairIndexes = materials.map((item, itemIndex) => (item.group === groupOrders[index] ? itemIndex : -1)).filter((itemIndex) => itemIndex >= 0);
    const column = Math.max(0, pairIndexes.indexOf(index));
    const targetTagSize = 19 * unit;
    const tagWidths = pairIndexes.map((itemIndex) => measure(materials[itemIndex].title, targetTagSize) + 42 * unit);
    const gap = 18 * unit;
    const totalTagW = tagWidths.reduce((sum, width) => sum + width, 0);
    const maxTagW = track.w - 42 * unit - gap * Math.max(0, pairIndexes.length - 1);
    const fitScale = Math.min(1, Math.max(0.74, maxTagW / Math.max(1, totalTagW)));
    const visibleWidths = tagWidths.map((width) => width * fitScale);
    const totalW = visibleWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, pairIndexes.length - 1);
    const startX = track.x + (track.w - totalW) / 2;
    const x = startX + visibleWidths.slice(0, column).reduce((sum, width) => sum + width + gap, 0);
    const slotH = 54 * unit;
    return {
      x,
      y: track.y + 166 * unit,
      w: visibleWidths[column],
      h: slotH,
    };
  };

  const workGap = stageW * 0.027;
  const workAreaW = stageW * 0.84;
  const workX = centerX - workAreaW / 2;
  const workW = (workAreaW - workGap * 2) / 3;
  const workH = clamp(height * 0.3, 245 * unit, 300 * unit);
  const workRects = workRows.map((_, index) => ({
    x: workX + index * (workW + workGap),
    y: centerY - workH * 0.47,
    w: workW,
    h: workH,
  }));

  const todayW = Math.min(stageW * 0.78, height * 1.3);
  const todayH = clamp(height * 0.66, 520 * unit, 640 * unit);
  const todayRect = {
    x: centerX - todayW / 2,
    y: centerY - todayH / 2,
    w: todayW,
    h: todayH,
  };
  const todayPad = Math.max(42 * unit, todayRect.w * 0.045);
  const todayTop = todayRect.y + todayPad;
  const todayStatusY = todayRect.y + todayRect.h - 70 * unit;
  const todayPanelGap = 22 * unit;
  const todayPanelW = (todayRect.w - todayPad * 2 - todayPanelGap * 2) / 3;
  const todayPanelTop = Math.min(todayTop + 296 * unit, todayStatusY - 148 * unit);
  const todayPanelH = Math.max(118 * unit, todayStatusY - todayPanelTop - 24 * unit);
  const todayPanelRects = todayPanels.map((_, index) => ({
    x: todayRect.x + todayPad + index * (todayPanelW + todayPanelGap),
    y: todayPanelTop,
    w: todayPanelW,
    h: todayPanelH,
  }));
  const buildIndexGap = 6 * unit;
  const buildIndexTop = todayPanelRects[0].y + 44 * unit;
  const buildIndexH = clamp((todayPanelRects[0].h - 44 * unit - buildIndexGap * 2) / 3, 24 * unit, 34 * unit);
  const buildIndexRects = workRows.map((_, index) => ({
    x: todayPanelRects[0].x,
    y: buildIndexTop + index * (buildIndexH + buildIndexGap),
    w: todayPanelRects[0].w,
    h: buildIndexH,
  }));

  const gather = phase(progress, 0.06, 0.2);
  const classify = phase(progress, 0.34, 0.56);
  const centerWorkMorph = phase(progress, 0.58, 0.72);
  const buildBridge = phase(progress, 0.82, 0.9);
  const todayMorph = phase(progress, 0.86, 0.98);
  const fieldAlpha = 1 - phase(progress, 0.9, 0.98);
  const buildIndexAlpha = phase(progress, 0.78, 0.82);
  const workSceneAlpha = 1 - buildIndexAlpha;

  const inputHeaderReadability = 1 - phase(progress, 0.34, 0.4);
  const classifyHeaderReadability = 1 - phase(progress, 0.6, 0.66);
  const workHeaderReadability = phase(progress, 0.62, 0.7) * workSceneAlpha;
  const inputHeaderAlpha = phase(progress, 0.12, 0.22) * inputHeaderReadability;
  const classifyAlpha = phase(progress, 0.38, 0.48) * classifyHeaderReadability;
  const centerWorkAlpha = phase(progress, 0.44, 0.56) * workSceneAlpha;
  const sideTrackAlpha = (index: number) => classifyAlpha * (index === 1 ? 0 : 1 - centerWorkMorph);
  const workHeaderAlpha = workHeaderReadability;
  const todayAlpha = phase(progress, 0.84, 0.88);
  const centerWorkRect = moveRect(trackRects[1], workRects[1], centerWorkMorph);

  const drawEditorialMaterial = (
    rect: Rect,
    item: (typeof materials)[number],
    compact: number,
    alpha: number,
    detailReveal = 1,
    index = 0,
  ) => {
    withAlpha(ctx, alpha, () => {
      const layout = materialLabelLayout(rect, item, compact);
      const detailAlpha = detailReveal * (1 - phase(compact, 0.48, 0.88));

      clipRect({ x: rect.x - 8 * unit, y: rect.y - 10 * unit, w: rect.w + 16 * unit, h: rect.h + 20 * unit }, () => {
        drawMaterialRule(layout.ruleX, layout.ruleY, layout.ruleW, item.active);
        withAlpha(ctx, layout.numberAlpha, () => {
          const materialNumber = String(index + 1).padStart(2, "0");
          text(materialNumber, rect.x + layout.pad, layout.numberY, 14 * unit, item.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
        });
          text(item.title, layout.titleX, layout.titleY, layout.titleSize, item.active ? palette.aiAccent : palette.text, "'JetBrains Mono', monospace", 700);

        withAlpha(ctx, detailAlpha, () => {
          wrapText(item.note, rect.w - layout.pad * 2, 17 * unit, "'JetBrains Mono', monospace", 600, 1).forEach((line) => {
            text(line, rect.x + layout.pad, rect.y + rect.h - 22 * unit, 17 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
          });
        });
      });
    });
  };

  const drawEditorialTrack = (rect: Rect, track: (typeof tracks)[number], index: number, alpha: number, textAlpha = 1) => {
    withAlpha(ctx, alpha, () => {
      const pad = 24 * unit;
      clipRect(rect, () => {
        drawEditorialRule(rect.x + pad, rect.y + 17 * unit, rect.w * 0.34, index === 1, index === 1);
        drawEditorialDot(rect.x + pad + rect.w * 0.34 + 12 * unit, rect.y + 17 * unit, index === 1, index === 1);
        withAlpha(ctx, textAlpha, () => {
          text(`0${index + 1}`, rect.x + pad, rect.y + 52 * unit, 17 * unit, index === 1 ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
          text(track.label, rect.x + pad + 54 * unit, rect.y + 52 * unit, 22 * unit, index === 1 ? palette.aiAccent : palette.muted, "'JetBrains Mono', monospace", 700);
          textFit(track.title, rect.x + pad, rect.y + 98 * unit, 32 * unit, rect.w - pad * 2, index === 1 ? palette.aiAccent : palette.text, "'Fraunces', 'Noto Serif SC', serif", 600, 23 * unit);
          wrapText(track.note, rect.w - pad * 2, 17 * unit, "'JetBrains Mono', monospace", 600, 2).forEach((line, lineIndex) => {
            text(line, rect.x + pad, rect.y + 132 * unit + lineIndex * 22 * unit, 17 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
          });
        });
      });
    });
  };

  const drawEditorialWork = (
    rect: Rect,
    row: (typeof workRows)[number],
    sourceTrack: (typeof tracks)[number],
    amount: number,
    alpha: number,
    showSourceText = true,
  ) => {
    withAlpha(ctx, alpha, () => {
      const pad = lerp(24 * unit, 34 * unit, amount);
      const trackTextAlpha = showSourceText ? 1 - phase(amount, 0.08, 0.38) : 0;
      const workTextAlpha = phase(amount, 0.32, 0.72);

      clipRect({ x: rect.x - 12 * unit, y: rect.y - 12 * unit, w: rect.w + 24 * unit, h: rect.h + 24 * unit }, () => {
        drawEditorialRule(rect.x + pad, rect.y + 20 * unit, Math.min(rect.w * 0.32, 116 * unit), row.active, row.active);
        if (row.active) drawEditorialDot(rect.x + pad + Math.min(rect.w * 0.32, 116 * unit) + 12 * unit, rect.y + 20 * unit, true, true);

        withAlpha(ctx, trackTextAlpha, () => {
          text(String(row.from + 1).padStart(2, "0"), rect.x + pad, rect.y + 55 * unit, 17 * unit, row.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
          text(sourceTrack.label, rect.x + pad + 54 * unit, rect.y + 55 * unit, 23 * unit, row.active ? palette.aiAccent : palette.muted, "'JetBrains Mono', monospace", 700);
          textFit(sourceTrack.title, rect.x + pad, rect.y + 96 * unit, 31 * unit, rect.w - pad * 2, row.active ? palette.aiAccent : palette.text, "'Fraunces', 'Noto Serif SC', serif", 600, 22 * unit);
          wrapText(sourceTrack.note, rect.w - pad * 2, 19 * unit, "'JetBrains Mono', monospace", 600, 2).forEach((line, index) => {
            text(line, rect.x + pad, rect.y + 128 * unit + index * 24 * unit, 19 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
          });
        });

        withAlpha(ctx, workTextAlpha, () => {
          text(row.label, rect.x + pad, rect.y + 55 * unit, 22 * unit, row.active ? palette.aiAccent : palette.muted, "'JetBrains Mono', monospace", 700);
          textFit(row.title, rect.x + pad, rect.y + 120 * unit, clamp(rect.w * 0.16, 45 * unit, 64 * unit), rect.w - pad * 2, row.active ? palette.aiAccent : palette.text, "'Fraunces', 'Noto Serif SC', serif", 600, 36 * unit);
          wrapText(row.note, rect.w - pad * 2, 21 * unit, "'JetBrains Mono', monospace", 600, 3).forEach((line, index) => {
            text(line, rect.x + pad, rect.y + 162 * unit + index * 28 * unit, 21 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
          });
          row.details.forEach((detail, index) => {
            text(detail, rect.x + pad, rect.y + rect.h - 52 * unit + index * 26 * unit, 18 * unit, palette.quiet, "'JetBrains Mono', monospace", 600);
          });
        });
      });
    });
  };

  const drawBuildIndexRow = (
    rect: Rect,
    row: (typeof workRows)[number],
    index: number,
    amount: number,
    alpha: number,
  ) => {
    withAlpha(ctx, alpha, () => {
      const baseline = rect.y + clamp(rect.h * 0.72, 17 * unit, 23 * unit);
      const numberW = lerp(42 * unit, 34 * unit, amount);
      const titleSize = lerp(19 * unit, 16 * unit, amount);
      const ruleW = Math.min(rect.w * lerp(0.2, 0.32, amount), 70 * unit);

      clipRect({ x: rect.x - 4 * unit, y: rect.y - 5 * unit, w: rect.w + 8 * unit, h: rect.h + 10 * unit }, () => {
        drawEditorialRule(rect.x, rect.y + 1 * unit, ruleW, row.active, row.active);
        text(String(index + 1).padStart(2, "0"), rect.x, baseline, 14 * unit, row.active ? palette.aiAccent : palette.quiet, "'JetBrains Mono', monospace", 700);
        textFit(row.title, rect.x + numberW, baseline, titleSize, rect.w - numberW, row.active ? palette.aiAccent : palette.text, "'JetBrains Mono', monospace", 700, 12 * unit);
      });
    });
  };

  const drawBuildIndex = (rects: Rect[], headingAlpha: number, rowAlpha = headingAlpha) => {
    const panel = todayPanelRects[0];
    withAlpha(ctx, headingAlpha, () => {
      drawEditorialRule(panel.x, panel.y, panel.w * 0.34, true);
      text(input.current.panels[0]?.tag ?? "", panel.x, panel.y + 34 * unit, 22 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
    });
    rects.forEach((rect, index) => drawBuildIndexRow(rect, workRows[index], index, 1, rowAlpha));
  };

  const drawFoldingWorkRow = (
    rect: Rect,
    row: (typeof workRows)[number],
    index: number,
    amount: number,
    alpha: number,
  ) => {
    const detailAlpha = 1 - phase(amount, 0.18, 0.48);
    const indexAlpha = phase(amount, 0.2, 0.72);

    withAlpha(ctx, alpha, () => {
      drawEditorialWork(rect, row, tracks[row.from], 1, detailAlpha, false);
      drawBuildIndexRow(rect, row, index, phase(amount, 0.18, 0.8), indexAlpha);
    });
  };

  const drawTodayPanel = (rect: Rect, panel: StoryTodayPanel, index: number, amount: number) => {
    withAlpha(ctx, amount, () => {
      clipRect({ x: rect.x - 4 * unit, y: rect.y - 8 * unit, w: rect.w + 8 * unit, h: rect.h + 16 * unit }, () => {
        drawEditorialRule(rect.x, rect.y, rect.w * 0.34 * phase(amount, 0.02, 0.5), false);
        text(panel.tag, rect.x, rect.y + 34 * unit, 22 * unit, palette.muted, "'JetBrains Mono', monospace", 700);
        const titleLines = wrapText(panel.title, rect.w, 23 * unit, "'Fraunces', 'Noto Serif SC', serif", 600, 2);
        titleLines.forEach((line, lineIndex) => {
          text(line, rect.x, rect.y + 72 * unit + lineIndex * 25 * unit, 23 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
        });
        const bodyY = rect.y + (titleLines.length > 1 ? 124 : 102) * unit;
        wrapText(panel.note, rect.w, 16 * unit, "'JetBrains Mono', monospace", 600, 2).forEach((line, lineIndex) => {
          text(line, rect.x, bodyY + lineIndex * 19 * unit, 16 * unit, index === 1 ? palette.muted : palette.quiet, "'JetBrains Mono', monospace", 600);
        });
      });
    });
  };

  const drawEditorialToday = (rect: Rect, amount: number) => {
    const todayContentAlpha = phase(amount, 0.04, 0.34);

    clipRect(rect, () => {
      withAlpha(ctx, todayContentAlpha, () => {
        text(`today / ${input.screenTitle}`, rect.x + todayPad, todayTop, 29 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
        const nowMaxW = Math.min(rect.w * 0.34, 230 * unit);
        textFit(input.now, rect.x + rect.w - todayPad - nowMaxW, todayTop, 22 * unit, nowMaxW, palette.muted, "'JetBrains Mono', monospace", 600, 15 * unit);
        drawEditorialRule(rect.x + todayPad, todayTop + 29 * unit, Math.min(rect.w * 0.22, 176 * unit), true);

        const nameSize = clamp(rect.w * 0.14, 108 * unit, 142 * unit);
        text(input.screenTitle, rect.x + todayPad, todayTop + 120 * unit, nameSize, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
        textFit(input.current.stack, rect.x + todayPad, todayTop + 184 * unit, 39 * unit, rect.w - todayPad * 2, palette.text, "'JetBrains Mono', monospace", 700, 26 * unit);
        wrapText(input.current.summary, rect.w - todayPad * 2, 25 * unit, "'JetBrains Mono', monospace", 600, 2).forEach((line, index) => {
          text(line, rect.x + todayPad, todayTop + 224 * unit + index * 30 * unit, 25 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
        });
      });

      todayPanels.slice(1).forEach((panel, index) => {
        drawTodayPanel(todayPanelRects[index + 1], panel, index + 1, todayContentAlpha);
      });

      withAlpha(ctx, todayContentAlpha, () => {
        drawEditorialRule(rect.x + todayPad, todayStatusY - 12 * unit, rect.w - todayPad * 2);
        textFit(input.current.status, rect.x + todayPad, todayStatusY + 22 * unit, 23 * unit, (rect.w - todayPad * 2) * 0.54, palette.text, "'JetBrains Mono', monospace", 700, 18 * unit);
        const contact = input.current.contact;
        textFit(contact, rect.x + rect.w - todayPad - (rect.w - todayPad * 2) * 0.38, todayStatusY + 22 * unit, 20 * unit, (rect.w - todayPad * 2) * 0.38, palette.muted, "'JetBrains Mono', monospace", 600, 15 * unit);
      });
    });
  };

  const drawDioramaCenterFrame = (alpha: number) => {
    if (!dioramaMode || dioramaPresence <= 0.001) return;

    withAlpha(ctx, alpha * dioramaPresence, () => {
      ctx.save();
      ctx.strokeStyle = input.theme === "dark" ? "rgba(238, 242, 246, 0.1)" : "rgba(16, 16, 16, 0.09)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3 * unit, 18 * unit]);
      ctx.beginPath();
      ctx.ellipse(dioramaCoreX, dioramaCoreY + 12 * unit, dioramaFocusGuardX * 0.88, dioramaFocusGuardY * 0.54, -0.08, Math.PI * 0.08, Math.PI * 1.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(dioramaCoreX, dioramaCoreY + 12 * unit, dioramaFocusGuardX * 1.05, dioramaFocusGuardY * 0.66, -0.08, Math.PI * 1.04, Math.PI * 1.78);
      ctx.stroke();
      ctx.restore();
    });
  };

  const drawDioramaIdentityPanel = (alpha: number) => {
    if (!dioramaMode || dioramaPresence <= 0.001) return;

    const panelAlpha = alpha;
    const titleSize = clamp(height * 0.17, 128 * unit, 192 * unit);
    const titleX = dioramaTitleX;

    withAlpha(ctx, panelAlpha, () => {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = `600 ${titleSize}px 'Fraunces', 'Noto Serif SC', serif`;
      ctx.fillStyle = palette.text;
      ctx.shadowColor = input.theme === "dark" ? "rgba(0, 0, 0, 0.24)" : "rgba(16, 16, 16, 0.055)";
      ctx.shadowBlur = 15 * unit;
      ctx.shadowOffsetY = 8 * unit;
      ctx.fillText(input.screenTitle, titleX, dioramaTitleY);
      ctx.shadowColor = "transparent";

      ctx.restore();
    });
  };

  withAlpha(ctx, fieldAlpha, () => {
    if (dioramaMode) {
      drawDioramaCenterFrame((1 - classify) * (1 - phase(progress, 0.56, 0.7)));
    } else {
      drawIntro(ctx, input, progress, "desktop", input.theme, width, height);
    }

    stageHeader(input.sources.heading, input.sources.subheading, inputHeaderAlpha, height * 0.265, inputAreaX);
    stageHeader(input.lanes.heading, input.lanes.subheading, classifyAlpha, height * 0.265, trackX);
    stageHeader(input.projects.heading, input.projects.subheading, workHeaderAlpha, height * 0.245, workX);

    trackRects.forEach((rect, index) => {
      if (index !== 1) drawEditorialTrack(rect, tracks[index], index, sideTrackAlpha(index));
    });
    drawEditorialWork(centerWorkRect, workRows[1], tracks[1], centerWorkMorph, centerWorkAlpha, true);

    const centerClassifyAlpha = centerWorkAlpha * (1 - phase(centerWorkMorph, 0.08, 0.38));
    const materialInputAlpha = 1 - classify;
    const materialAlpha = (group: number) => Math.max(materialInputAlpha, group === 1 ? centerClassifyAlpha : sideTrackAlpha(group));
    const relationAlpha = (1 - phase(progress, 0.16, 0.22)) * (1 - classify);
    materials.forEach((item, index) => {
      const normalOffset = mindOffsets[index];
      const openingOffset = dioramaMindOffsets[index];
      const offset = {
        x: lerp(openingOffset.x, normalOffset.x, dioramaHandoff),
        y: lerp(openingOffset.y, normalOffset.y, dioramaHandoff),
      };
      const orbitHubX = lerp(dioramaCoreX, centerX, dioramaHandoff);
      const orbitHubY = lerp(dioramaCoreY, centerY, dioramaHandoff);
      const orbitAngle = item.angle + progress * 0.42;
      const orbitW = inputCardW * 0.46;
      const orbitH = inputCardH * 0.62;
      const orbit: Rect = {
        x: clamp(orbitHubX + offset.x + Math.cos(orbitAngle) * stageW * 0.012 - orbitW / 2, safeX, safeRight - orbitW),
        y: orbitHubY + offset.y + Math.sin(orbitAngle) * height * 0.014 - orbitH / 2,
        w: orbitW,
        h: orbitH,
      };
      const collected = moveRect(orbit, inputRects[index], gather);
      const rect = moveRect(collected, trackSlot(index), classify);
      const anchor = materialAnchor(rect, item, classify);
      curvedConnector(anchor.fromX, anchor.fromY, anchor.toX, anchor.toY, relationAlpha);
      drawEditorialMaterial(rect, item, classify, materialAlpha(item.group), phase(gather, 0.78, 1), index);
    });

    drawDioramaIdentityPanel((1 - classify) * (1 - phase(progress, 0.16, 0.24)));

    [0, 2].forEach((index) => {
      const row = workRows[index];
      const sideWorkEnd = 0.74;
      const sideWorkStart = index === 0 ? 0.64 : 0.66;
      const sidePull = phase(progress, sideWorkStart, sideWorkEnd);

      const sideDirection = index === 0 ? -1 : 1;
      const sideSourceRect = {
        x: centerWorkRect.x + sideDirection * centerWorkRect.w * 0.16,
        y: centerWorkRect.y + 18 * unit,
        w: centerWorkRect.w,
        h: centerWorkRect.h,
      };
      const rect = moveRect(sideSourceRect, workRects[index], sidePull);
      const sideAlpha = phase(progress, sideWorkStart - 0.01, sideWorkEnd) * workSceneAlpha;
      drawEditorialWork(rect, row, tracks[row.from], sidePull, sideAlpha, false);
    });
  });

  withAlpha(ctx, buildIndexAlpha, () => {
    drawBuildIndex(buildIndexRects, phase(buildBridge, 0.18, 0.46), 0);
    workRows.forEach((row, index) => {
      const rect = moveRect(workRects[index], buildIndexRects[index], buildBridge);
      drawFoldingWorkRow(rect, row, index, buildBridge, 1);
    });
  });

  withAlpha(ctx, todayAlpha, () => {
    drawEditorialToday(todayRect, todayMorph);
  });

};

export const drawHomeScreenStory = (ctx: CanvasRenderingContext2D, input: StoryInput) => {
  const palette = PALETTES[input.theme];
  const progress = clamp(input.progress);
  const pixelRatio = Math.max(1, input.pixelRatio ?? 1);
  const layoutPixelRatio = Math.max(1, input.layoutPixelRatio ?? pixelRatio);
  const layoutWidth = (ctx.canvas.width / pixelRatio) * layoutPixelRatio;
  const layoutHeight = (ctx.canvas.height / pixelRatio) * layoutPixelRatio;
  ctx.setTransform(pixelRatio / layoutPixelRatio, 0, 0, pixelRatio / layoutPixelRatio, 0, 0);
  if (input.device === "mobile") {
    if (input.revealCenterDiorama) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      drawBackground(ctx, palette, progress, layoutWidth, layoutHeight);
    }
    drawMobileStory(ctx, input, palette, progress, layoutWidth, layoutHeight);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return;
  }

  if (input.revealCenterDiorama) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    drawBackground(ctx, palette, progress, layoutWidth, layoutHeight);
  }
  drawDesktopStory(ctx, input, palette, progress, layoutWidth, layoutHeight);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

export const drawHomeScreenBackdrop = (
  ctx: CanvasRenderingContext2D,
  input: Pick<StoryInput, "theme" | "progress">,
) => {
  const palette = PALETTES[input.theme];
  drawBackground(ctx, palette, clamp(input.progress));
};
