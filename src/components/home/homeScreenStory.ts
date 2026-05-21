import { HOME_PROFILE } from "@/consts";

export type HomeScreenStoryDevice = "desktop" | "mobile";
export type HomeScreenStoryTheme = "light" | "dark";

type StoryInput = {
  device: HomeScreenStoryDevice;
  theme: HomeScreenStoryTheme;
  progress: number;
  now: string;
  stack: string;
  contact: string;
  postsLabel: string;
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
  line: string;
  shadow: string;
};

const PALETTES: Record<HomeScreenStoryTheme, Palette> = {
  light: {
    bg: "#f5f7ff",
    bg2: "#eef2ff",
    paper: "rgba(255, 255, 255, 0.9)",
    paperStrong: "rgba(255, 255, 255, 0.94)",
    soft: "rgba(248, 250, 252, 0.86)",
    text: "#0f172a",
    muted: "#475569",
    quiet: "rgba(71, 85, 105, 0.42)",
    accent: "#4b6bff",
    accentSoft: "rgba(75, 107, 255, 0.12)",
    line: "rgba(75, 107, 255, 0.19)",
    shadow: "rgba(37, 65, 183, 0.12)",
  },
  dark: {
    bg: "#0f172a",
    bg2: "#111827",
    paper: "rgba(30, 41, 59, 0.86)",
    paperStrong: "rgba(30, 41, 59, 0.96)",
    soft: "rgba(51, 65, 85, 0.68)",
    text: "#f1f5ff",
    muted: "#cbd5e1",
    quiet: "rgba(203, 213, 225, 0.62)",
    accent: "#91a7ff",
    accentSoft: "rgba(91, 124, 255, 0.22)",
    line: "rgba(129, 150, 255, 0.26)",
    shadow: "rgba(0, 0, 0, 0.36)",
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

const drawBackground = (ctx: CanvasRenderingContext2D, palette: Palette, progress: number) => {
  const { width, height } = ctx.canvas;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, palette.bg2);
  bg.addColorStop(0.58, palette.bg);
  bg.addColorStop(1, palette.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const orbA = ctx.createRadialGradient(width * 0.18, height * 0.15, 0, width * 0.18, height * 0.15, width * 0.28);
  orbA.addColorStop(0, palette.accentSoft);
  orbA.addColorStop(1, "rgba(75, 107, 255, 0)");
  ctx.fillStyle = orbA;
  ctx.fillRect(0, 0, width, height);

  const orbB = ctx.createRadialGradient(width * 0.78, height * 0.2, 0, width * 0.78, height * 0.2, width * 0.26);
  orbB.addColorStop(0, palette.line);
  orbB.addColorStop(1, "rgba(148, 163, 184, 0)");
  ctx.fillStyle = orbB;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(-progress * 84, -progress * 46);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  const grid = Math.max(34, Math.round(width / 76));
  for (let x = -grid; x < width + grid * 3; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, -grid);
    ctx.lineTo(x, height + grid * 2);
    ctx.stroke();
  }
  for (let y = -grid; y < height + grid * 3; y += grid) {
    ctx.beginPath();
    ctx.moveTo(-grid, y);
    ctx.lineTo(width + grid * 2, y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawChip = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, palette: Palette, active = false) => {
  ctx.save();
  ctx.font = "700 19px 'JetBrains Mono', monospace";
  const w = ctx.measureText(text).width + 34;
  rounded(ctx, { x, y, w, h: 42 }, 21, active ? palette.accentSoft : palette.soft, active ? palette.line : "rgba(148, 163, 184, 0.14)");
  ctx.fillStyle = active ? palette.accent : palette.muted;
  ctx.fillText(text, x + 17, y + 28);
  ctx.restore();
  return w;
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

const drawIntro = (ctx: CanvasRenderingContext2D, palette: Palette, progress: number, device: HomeScreenStoryDevice) => {
  const { width, height } = ctx.canvas;
  const alpha = 1 - phase(progress, 0.11, 0.25);
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.translate(width / 2, height * (device === "mobile" ? 0.32 : 0.45) - phase(progress, 0, 0.22) * height * 0.06);
    ctx.fillStyle = palette.text;
    ctx.textAlign = "center";
    ctx.font = `500 ${device === "mobile" ? width * 0.26 : width * 0.13}px 'Fraunces', 'Noto Serif SC', serif`;
    ctx.fillText("lsy", 0, 0);
    ctx.font = `500 ${device === "mobile" ? 22 : 24}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = palette.muted;
    ctx.fillText("today in echoes", 0, device === "mobile" ? 52 : 68);
    ctx.restore();

    const tags = ["AI", "Web", "Rust", "Film", "Travel", "Books"];
    tags.forEach((tag, index) => {
      const angle = (Math.PI * 2 * index) / tags.length + progress * 0.7;
      const radiusX = device === "mobile" ? width * 0.32 : width * 0.28;
      const radiusY = device === "mobile" ? height * 0.2 : height * 0.24;
      const x = width / 2 + Math.cos(angle) * radiusX - 46;
      const y = height * (device === "mobile" ? 0.35 : 0.45) + Math.sin(angle) * radiusY;
      drawChip(ctx, tag, x, y, palette, index === 0);
    });
  });
};

const drawMobileStory = (
  ctx: CanvasRenderingContext2D,
  input: StoryInput,
  palette: Palette,
  progress: number,
) => {
  const { width, height } = ctx.canvas;
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
  const radius = 30 * unit;
  const hairline = input.theme === "dark" ? "rgba(148, 163, 184, 0.24)" : "rgba(148, 163, 184, 0.14)";
  const glass = input.theme === "dark" ? "rgba(30, 41, 59, 0.72)" : "rgba(255, 255, 255, 0.56)";
  const slotFill = input.theme === "dark" ? "rgba(51, 65, 85, 0.48)" : "rgba(255, 255, 255, 0.22)";

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

  const mobileCard = (rect: Rect, label: string, title: string, lines: string[], active = false) => {
    rounded(ctx, rect, radius, active ? palette.accentSoft : palette.paper, active ? palette.line : hairline, palette.shadow);
    const pad = Math.max(24 * unit, rect.w * 0.062);
    text(label, rect.x + pad, rect.y + pad + 6 * unit, smallSize, palette.muted, "'JetBrains Mono', monospace", 700);
    text(title, rect.x + pad, rect.y + rect.h * 0.5, Math.min(titleSize * 0.78, rect.w * 0.112), palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
    lines.forEach((line, index) => {
      text(line, rect.x + pad, rect.y + rect.h * 0.7 + index * bodySize * 1.18, smallSize * 0.95, palette.muted, "'JetBrains Mono', monospace", 600);
    });
  };

  const mobileChip = (value: string, x: number, y: number, active = false) => {
    ctx.save();
    ctx.font = `700 ${smallSize * 0.9}px 'JetBrains Mono', monospace`;
    const chipW = ctx.measureText(value).width + 28 * unit;
    const chipH = 32 * unit;
    rounded(ctx, { x, y, w: chipW, h: chipH }, chipH / 2, active ? palette.accentSoft : palette.soft, active ? palette.line : hairline);
    ctx.fillStyle = active ? palette.accent : palette.muted;
    ctx.fillText(value, x + 14 * unit, y + 21 * unit);
    ctx.restore();
    return chipW;
  };

  const rowCard = (rect: Rect, label: string, title: string, body: string, index: number) => {
    rounded(ctx, rect, radius * 0.7, palette.paper, hairline, palette.shadow);
    const pad = 22 * unit;
    text(`0${index}`, rect.x + pad, rect.y + rect.h * 0.34, smallSize * 0.9, palette.accent, "'JetBrains Mono', monospace", 700);
    text(title, rect.x + pad, rect.y + rect.h * 0.6, bodySize * 1.03, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
    ctx.save();
    ctx.font = `700 ${smallSize * 0.82}px 'JetBrains Mono', monospace`;
    const labelWidth = ctx.measureText(label).width;
    ctx.restore();
    text(label, rect.x + rect.w - pad - labelWidth, rect.y + rect.h * 0.34, smallSize * 0.82, palette.muted, "'JetBrains Mono', monospace", 700);
    text(body, rect.x + pad, rect.y + rect.h * 0.84, smallSize * 0.82, palette.muted, "'JetBrains Mono', monospace", 600);
  };

  const snapshotPanel = (rect: Rect, label: string, title: string, _body: string, active = false) => {
    rounded(
      ctx,
      rect,
      radius * 0.5,
      active ? palette.accentSoft : glass,
      active ? palette.line : hairline,
    );
    const pad = 16 * unit;
    text(label, rect.x + pad, rect.y + rect.h * 0.34, smallSize * 0.78, active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
    text(title, rect.x + pad, rect.y + rect.h * 0.74, bodySize * 0.72, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
  };

  const stageY = (enter: number, exit: number, direction = 1) => {
    const inShift = (1 - phase(progress, enter, enter + 0.12)) * safeH * 0.12 * direction;
    const outShift = phase(progress, exit, exit + 0.1) * safeH * -0.1 * direction;
    return inShift + outShift;
  };

  const gap = 18 * unit;
  const cardW = (safe.w - gap) / 2;
  const cardH = safe.h * 0.19;
  const inputCards: [string, string, string][] = [
    ["Film", "frames", "clips / texture"],
    ["Travel", "routes", "places / notes"],
    ["Books", "margins", "quotes / ideas"],
    ["AI", "systems", "agents / tools"],
  ];
  const inputRects = inputCards.map((_, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: safe.x + col * (cardW + gap),
      y: safe.y + 52 * unit + row * (cardH + gap),
      w: cardW,
      h: cardH,
    };
  });

  const gather = phase(progress, 0.14, 0.42);
  const introAlpha = 1 - phase(progress, 0.2, 0.34);
  const chipAlpha = 1 - phase(progress, 0.34, 0.46);
  const frameAlpha = phase(progress, 0.08, 0.18) * (1 - phase(progress, 0.32, 0.44));
  const slotAlpha = phase(progress, 0.16, 0.32) * (1 - phase(progress, 0.46, 0.58));
  const introCenter = {
    x: width / 2,
    y: safe.y + safe.h * 0.36 - phase(progress, 0.08, 0.3) * 18 * unit,
    scale: lerp(1, 0.96, gather),
  };

  withAlpha(ctx, introAlpha, () => {
    ctx.save();
    ctx.translate(introCenter.x, introCenter.y + stageY(0, 0.22, 0.22));
    ctx.scale(introCenter.scale, introCenter.scale);
    ctx.textAlign = "center";
    ctx.fillStyle = palette.text;
    ctx.font = `500 ${width * 0.25}px 'Fraunces', 'Noto Serif SC', serif`;
    ctx.fillText("lsy", 0, 0);
    ctx.font = `500 ${smallSize}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = palette.muted;
    ctx.fillText("today in echoes", 0, 56 * unit);
    ctx.restore();
  });

  withAlpha(ctx, frameAlpha, () => {
    const frameT = phase(progress, 0.1, 0.26);
    const frame: Rect = {
      x: lerp(safe.x + safe.w * 0.24, safe.x - 10 * unit, frameT),
      y: lerp(safe.y + safe.h * 0.46, safe.y + 30 * unit, frameT),
      w: lerp(safe.w * 0.52, safe.w + 20 * unit, frameT),
      h: lerp(86 * unit, safe.h * 0.44, frameT),
    };
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 3 * unit;
    ctx.lineCap = "round";
    const corner = 46 * unit;
    const inset = 10 * unit;
    const left = frame.x + inset;
    const right = frame.x + frame.w - inset;
    const top = frame.y + inset;
    const bottom = frame.y + frame.h - inset;
    ctx.beginPath();
    ctx.moveTo(left, top + corner);
    ctx.lineTo(left, top);
    ctx.lineTo(left + corner, top);
    ctx.moveTo(right - corner, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, top + corner);
    ctx.moveTo(right, bottom - corner);
    ctx.lineTo(right, bottom);
    ctx.lineTo(right - corner, bottom);
    ctx.moveTo(left + corner, bottom);
    ctx.lineTo(left, bottom);
    ctx.lineTo(left, bottom - corner);
    ctx.stroke();
    const scanY = lerp(frame.y + 18 * unit, frame.y + frame.h - 18 * unit, phase(progress, 0.12, 0.28));
    const scanGrad = ctx.createLinearGradient(0, scanY - 28 * unit, 0, scanY + 28 * unit);
    scanGrad.addColorStop(0, "rgba(75, 107, 255, 0)");
    scanGrad.addColorStop(0.5, input.theme === "dark" ? "rgba(131, 157, 255, 0.14)" : "rgba(75, 107, 255, 0.12)");
    scanGrad.addColorStop(1, "rgba(75, 107, 255, 0)");
    ctx.fillStyle = scanGrad;
    ctx.fillRect(frame.x, scanY - 28 * unit, frame.w, 56 * unit);
    ctx.restore();
  });

  withAlpha(ctx, slotAlpha, () => {
    inputRects.forEach((rect, index) => {
      rounded(
        ctx,
        {
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
        },
        radius * 0.72,
        index === 3 ? palette.accentSoft : slotFill,
        index === 3 ? palette.line : hairline,
      );
    });
  });

  withAlpha(ctx, chipAlpha, () => {
    const tagItems = [
      { value: "Film", target: 0, active: false, mini: false, offsetX: -24, offsetY: 44 },
      { value: "Travel", target: 1, active: false, mini: false, offsetX: 20, offsetY: 38 },
      { value: "Books", target: 2, active: false, mini: false, offsetX: -14, offsetY: 36 },
      { value: "AI", target: 3, active: true, mini: false, offsetX: 24, offsetY: 42 },
      { value: "Web", target: 3, active: false, mini: true, offsetX: -28, offsetY: 88 },
      { value: "Rust", target: 3, active: false, mini: true, offsetX: 42, offsetY: 88 },
    ];

    tagItems.forEach((item, index) => {
      const targetRect = inputRects[item.target];
      const targetX = item.mini ? targetRect.x + targetRect.w * (index === 4 ? 0.16 : 0.48) : targetRect.x + 18 * unit;
      const targetY = item.mini ? targetRect.y + targetRect.h - 44 * unit : targetRect.y + 22 * unit;
      const fromX = targetX + item.offsetX * unit;
      const fromY = targetRect.y + targetRect.h * 0.58 + item.offsetY * unit;
      const driftX = Math.sin(progress * 8 + index * 1.7) * 10 * unit * (1 - gather);
      const driftY = Math.cos(progress * 7 + index * 1.3) * 8 * unit * (1 - gather);
      const x = lerp(fromX + driftX, targetX, gather);
      const y = lerp(fromY + driftY, targetY, gather);
      const scale = lerp(1, item.mini ? 0.72 : 0.84, gather);
      const localAlpha = item.mini ? 1 - phase(progress, 0.28, 0.42) : 1;
      withAlpha(ctx, localAlpha, () => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        mobileChip(item.value, 0, 0, item.active);
        ctx.restore();
      });
    });
  });

  const lineX = safe.x + 36 * unit;
  const methodStartY = safe.y + 96 * unit;
  const methodGap = safe.h * 0.165;
  const methodRects = inputCards.map((_, index) => ({
    x: lineX + 42 * unit,
    y: methodStartY + index * methodGap - 24 * unit,
    w: safe.w - 68 * unit,
    h: 62 * unit,
  }));
  const toMethod = phase(progress, 0.52, 0.66);
  const inputAlpha = phase(progress, 0.32, 0.48) * (1 - phase(progress, 0.66, 0.74));

  withAlpha(ctx, inputAlpha, () => {
    const label = toMethod < 0.5 ? "input" : "method";
    text(label, safe.x, safe.y, smallSize * 1.08, palette.accent, "'JetBrains Mono', monospace", 700);

    withAlpha(ctx, phase(toMethod, 0.12, 0.42), () => {
      ctx.save();
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = 0.36;
      ctx.lineWidth = 4 * unit;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lineX, methodStartY);
      ctx.lineTo(lineX, methodStartY + methodGap * 3);
      ctx.stroke();
      ctx.restore();
    });

    inputCards.forEach((item, index) => {
      const rect = moveRect(inputRects[index], methodRects[index], toMethod);
      const r = lerp(radius * 0.72, radius * 0.42, toMethod);
      rounded(ctx, rect, r, index === 3 ? palette.accentSoft : palette.paper, index === 3 ? palette.line : hairline, palette.shadow);
      const pad = lerp(18 * unit, 12 * unit, toMethod);
      const title = toMethod < 0.58 ? item[1] : ["observe", "archive", "connect", "build"][index];
      const meta = toMethod < 0.58 ? item[2] : ["material", "archive", "relation", "project"][index];
      text(item[0], rect.x + pad, rect.y + lerp(38 * unit, 18 * unit, toMethod), smallSize * lerp(1, 0.8, toMethod), palette.muted, "'JetBrains Mono', monospace", 700);
      text(title, rect.x + pad, rect.y + lerp(rect.h * 0.58, 42 * unit, toMethod), lerp(bodySize * 1.02, bodySize * 0.84, toMethod), palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      text(meta, rect.x + pad, rect.y + lerp(rect.h - 28 * unit, 58 * unit, toMethod), smallSize * lerp(0.88, 0.74, toMethod), palette.muted, "'JetBrains Mono', monospace", 600);
      if (toMethod > 0.35) {
        ctx.save();
        ctx.fillStyle = index <= Math.floor(toMethod * 4) ? palette.accent : palette.paperStrong;
        ctx.beginPath();
        ctx.arc(lineX, methodStartY + index * methodGap, 12 * unit, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  });

  const workAlpha = phase(progress, 0.62, 0.72) * (1 - phase(progress, 0.9, 0.96));
  const rowH = safe.h * 0.16;
  const workRows: [string, string, string][] = [
    ["system", "Ennoia", "memory / tools / permission"],
    ["api", "API Worker", "protocol / stream / fallback"],
    ["product", "真留平台", "mentor / search / chat"],
  ];
  const buildRect = {
    x: lineX + 42 * unit,
    y: methodStartY + methodGap * 3 - 24 * unit,
    w: safe.w - 68 * unit,
    h: 62 * unit,
  };
  const workRects = workRows.map((_, index) => ({
    x: safe.x,
    y: safe.y + 62 * unit + index * (rowH + gap),
    w: safe.w,
    h: rowH,
  }));
  withAlpha(ctx, workAlpha, () => {
    text("work", safe.x, safe.y, smallSize * 1.08, palette.accent, "'JetBrains Mono', monospace", 700);
    workRows.forEach((row, index) => {
      const rowAlpha = phase(progress, 0.64 + index * 0.045, 0.72 + index * 0.04);
      const stagger = phase(progress, 0.66 + index * 0.04, 0.78 + index * 0.03);
      withAlpha(ctx, rowAlpha, () => {
        const rect = moveRect(buildRect, workRects[index], stagger);
        rowCard(rect, row[0], row[1], row[2], index + 1);
      });
    });
  });

  const todayProgress = phase(progress, 0.84, 0.96);
  const todayAlpha = phase(progress, 0.82, 0.86);
  withAlpha(ctx, todayAlpha, () => {
    const source = workRects[1];
    const target = {
      x: safe.x,
      y: safe.y + safe.h * 0.04,
      w: safe.w,
      h: safe.h * 0.86,
    };
    const rect = moveRect(source, target, todayProgress);
    rounded(ctx, rect, radius, palette.paperStrong, "rgba(148, 163, 184, 0.16)", palette.shadow);
    const pad = 28 * unit;
    const contentAlpha = phase(todayProgress, 0.56, 0.86);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
    ctx.clip();
    withAlpha(ctx, contentAlpha, () => {
      const top = rect.y + pad;
      text("today / lsy", rect.x + pad, top + 10 * unit, smallSize * 0.9, palette.accent, "'JetBrains Mono', monospace", 700);
      ctx.save();
      ctx.strokeStyle = palette.line;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rect.x + pad, top + 26 * unit);
      ctx.lineTo(rect.x + rect.w - pad, top + 26 * unit);
      ctx.stroke();
      ctx.restore();

      text("lsy", rect.x + pad, top + 90 * unit, titleSize * 0.82, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      text("full-stack & AI engineer", rect.x + pad, top + 142 * unit, bodySize * 0.78, palette.text, "'JetBrains Mono', monospace", 700);
      text(input.stack, rect.x + pad, top + 176 * unit, smallSize * 0.78, palette.muted, "'JetBrains Mono', monospace", 600);

      const panels = [
        ["BUILD", "Ennoia / API Worker", "memory · stream · product"],
        ["WRITE", "blog.lsy22.com", "systems notes"],
        ["LIVE", "film / travel / books", "routes · margins · frames"],
      ] as const;
      const panelGap = 11 * unit;
      const panelH = 58 * unit;
      panels.forEach((panel, index) => {
        const sourceRect = workRects[Math.min(index, workRects.length - 1)];
        const targetPanel = {
          x: rect.x + pad,
          y: top + 204 * unit + index * (panelH + panelGap),
          w: rect.w - pad * 2,
          h: panelH,
        };
        const panelRect = moveRect(sourceRect, targetPanel, phase(todayProgress, 0.26 + index * 0.08, 0.72 + index * 0.04));
        snapshotPanel(panelRect, panel[0], panel[1], panel[2], index === 0);
      });

      const statusRect = {
        x: rect.x + pad,
        y: rect.y + rect.h - 96 * unit,
        w: rect.w - pad * 2,
        h: 68 * unit,
      };
      rounded(ctx, statusRect, radius * 0.66, palette.paper, hairline, palette.shadow);
      text("local workspace · updating", statusRect.x + 18 * unit, statusRect.y + 28 * unit, smallSize * 0.82, palette.text, "'JetBrains Mono', monospace", 700);
      text(input.now, statusRect.x + 18 * unit, statusRect.y + 53 * unit, smallSize * 0.72, palette.muted, "'JetBrains Mono', monospace", 600);
    });
    ctx.restore();
  });

};

const drawDesktopStoryLegacy = (
  ctx: CanvasRenderingContext2D,
  input: StoryInput,
  palette: Palette,
  progress: number,
) => {
  const { width, height } = ctx.canvas;
  const unit = clamp(Math.min(width / 1280, height / 760), 0.9, 1.25);
  const stageW = Math.min(width * 0.86, height * 1.62);
  const radius = 30 * unit;
  const hairline = input.theme === "dark" ? "rgba(148, 163, 184, 0.28)" : "rgba(148, 163, 184, 0.16)";

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
    const width = ctx.measureText(value).width;
    ctx.restore();
    return width;
  };

  const chip = (value: string, x: number, y: number, active = false, alpha = 1, scale = 1) => {
    withAlpha(ctx, alpha, () => {
      const size = 24 * unit;
      const h = 48 * unit;
      const w = measure(value, size) + 38 * unit;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      rounded(
        ctx,
        { x: 0, y: 0, w, h },
        h / 2,
        active ? palette.accentSoft : "rgba(255, 255, 255, 0.62)",
        active ? palette.line : "rgba(148, 163, 184, 0.2)",
      );
      text(value, 19 * unit, 32 * unit, size, active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      ctx.restore();
    });
  };

  const wire = (from: [number, number], to: [number, number], amount: number, alpha = 1) => {
    if (amount <= 0.001 || alpha <= 0.001) return;
    withAlpha(ctx, alpha, () => {
      ctx.save();
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha *= 0.1;
      ctx.lineWidth = 1.4 * unit;
      ctx.lineCap = "round";
      ctx.setLineDash([4 * unit, 10 * unit]);
      ctx.beginPath();
      const midX = lerp(from[0], to[0], 0.5);
      const midY = lerp(from[1], to[1], 0.5) - 42 * unit;
      ctx.moveTo(from[0], from[1]);
      ctx.quadraticCurveTo(midX, midY, lerp(from[0], to[0], amount), lerp(from[1], to[1], amount));
      ctx.stroke();
      ctx.restore();
    });
  };

  const workCard = (rect: Rect, label: string, title: string, body: string, active = false, contentAlpha = 1) => {
    rounded(ctx, rect, radius * 0.82, active ? palette.accentSoft : palette.paperStrong, active ? palette.line : "rgba(148, 163, 184, 0.16)", palette.shadow);
    withAlpha(ctx, contentAlpha, () => {
      const pad = 40 * unit;
      const titleSize = clamp(rect.w * 0.152, 46 * unit, 66 * unit);
      const bodySize = clamp(rect.w * 0.062, 23 * unit, 30 * unit);
      text(label, rect.x + pad, rect.y + 46 * unit, 24 * unit, active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      text(title, rect.x + pad, rect.y + 112 * unit, titleSize, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      text(body, rect.x + pad, rect.y + 160 * unit, bodySize, palette.muted, "'JetBrains Mono', monospace", 600);
      const detailMap: Record<string, { chips: string[]; lines: string[] }> = {
        system: {
          chips: ["memory", "sandbox", "permission"],
          lines: ["agent memory layers", "tool execution boundary"],
        },
        api: {
          chips: ["workers", "stream", "fallback"],
          lines: ["multi-model gateway", "stream protocol bridge"],
        },
        product: {
          chips: ["mentor", "search", "chat"],
          lines: ["mentor discovery", "consultation workflow"],
        },
      };
      const details = detailMap[label] ?? { chips: [], lines: [] };
      details.lines.forEach((line, index) => {
        text(line, rect.x + pad, rect.y + 204 * unit + index * 32 * unit, 22 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      });
      ctx.save();
      ctx.strokeStyle = active ? palette.line : "rgba(148, 163, 184, 0.16)";
      ctx.lineWidth = 1.2 * unit;
      for (let index = 0; index < 3; index += 1) {
        const y = rect.y + rect.h - (58 - index * 14) * unit;
        ctx.beginPath();
        ctx.moveTo(rect.x + pad, y);
        ctx.lineTo(rect.x + rect.w - pad, y);
        ctx.stroke();
      }
      ctx.restore();
      details.chips.forEach((detail, index) => {
        const x = rect.x + pad + index * rect.w * 0.25;
        const y = rect.y + rect.h - 39 * unit;
        const w = measure(detail, 19 * unit) + 24 * unit;
        rounded(ctx, { x, y, w, h: 32 * unit }, 16 * unit, active && index === 0 ? palette.accentSoft : palette.soft, active && index === 0 ? palette.line : "rgba(148, 163, 184, 0.14)");
        text(detail, x + 12 * unit, y + 22 * unit, 19 * unit, index === 0 && active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      });
    });
  };

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const heroRect: Rect = {
    x: centerX - stageW * 0.28,
    y: centerY - height * 0.27,
    w: stageW * 0.56,
    h: height * 0.54,
  };
  const stageTitleX = centerX - stageW * 0.39;
  const inputGrid = {
    x: stageTitleX,
    y: centerY - height * 0.16,
    colGap: stageW * 0.4,
    rowGap: 136 * unit,
  };
  const methodGapX = stageW * 0.04;
  const methodGapY = 30 * unit;
  const methodCardW = (stageW * 0.78 - methodGapX) / 2;
  const methodCardH = 140 * unit;
  const methodCardY = centerY - height * 0.08;
  const methodCards = Array.from({ length: 4 }, (_, index) => ({
    x: centerX - stageW * 0.39 + (index % 2) * (methodCardW + methodGapX),
    y: methodCardY + Math.floor(index / 2) * (methodCardH + methodGapY),
    w: methodCardW,
    h: methodCardH,
  }));
  const workRows: [string, string, string][] = [
    ["system", "Ennoia", "memory / tools / permission"],
    ["api", "API Worker", "protocol / stream / fallback"],
    ["product", "真留平台", "mentor / search / chat"],
  ];
  const workGap = stageW * 0.022;
  const workW = (stageW * 0.9 - workGap * 2) / 3;
  const workH = clamp(height * 0.36, 286 * unit, 350 * unit);
  const workRects = workRows.map((_, index) => ({
    x: centerX - stageW * 0.45 + index * (workW + workGap),
    y: centerY - workH * 0.42,
    w: workW,
    h: workH,
  }));
  const todayW = Math.min(stageW * 0.78, height * 1.3);
  const todayH = clamp(height * 0.66, 520 * unit, 640 * unit);
  const todayRect: Rect = {
    x: centerX - todayW / 2,
    y: centerY - todayH / 2,
    w: todayW,
    h: todayH,
  };

  const gather = phase(progress, 0.06, 0.2);
  const toMethod = phase(progress, 0.3, 0.48);
  const todayMorph = phase(progress, 0.86, 0.98);
  const fieldAlpha = 1 - phase(progress, 0.76, 0.86);
  const workAlpha = phase(progress, 0.54, 0.66) * (1 - phase(progress, 0.91, 0.97));
  const todayAlpha = phase(progress, 0.88, 0.92);

  const inputHeaderX = inputGrid.x;
  const inputHeaderY = inputGrid.y - 86 * unit;
  const methodHeaderX = stageTitleX;
  const methodHeaderY = methodCards[0].y - 100 * unit;
  const workHeaderX = workRects[0].x;
  const workHeaderY = workRects[0].y - 56 * unit;

  const inputSlot = (index: number) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cellW = stageW * 0.35;
    const cellH = 118 * unit;
    return {
      x: inputGrid.x + col * inputGrid.colGap + 22 * unit,
      y: inputGrid.y + row * inputGrid.rowGap + 20 * unit,
      cell: {
        x: inputGrid.x + col * inputGrid.colGap,
        y: inputGrid.y + row * inputGrid.rowGap,
        w: cellW,
        h: cellH,
      },
    };
  };

  const methodNode = (index: number) => {
    const card = methodCards[index];
    return {
      x: card.x + card.w / 2,
      y: card.y + card.h * 0.54,
    };
  };

  withAlpha(ctx, fieldAlpha, () => {
    const introAlpha = 1 - phase(progress, 0.08, 0.2);
    const inputLabelAlpha = phase(progress, 0.12, 0.24) * (1 - phase(progress, 0.34, 0.46));
    const methodLabelAlpha = phase(progress, 0.34, 0.46) * (1 - phase(progress, 0.72, 0.84));

    withAlpha(ctx, introAlpha, () => {
      const ringProgress = phase(progress, 0.02, 0.16);
      ctx.save();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1.3 * unit;
      ctx.globalAlpha *= 0.72;
      ctx.beginPath();
      ctx.arc(centerX, centerY - height * 0.01, lerp(96 * unit, 168 * unit, ringProgress), -Math.PI * 0.18, Math.PI * 1.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY - height * 0.01, lerp(138 * unit, 218 * unit, ringProgress), Math.PI * 0.82, Math.PI * 1.86);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = palette.text;
      ctx.font = `500 ${184 * unit}px 'Fraunces', 'Noto Serif SC', serif`;
      ctx.fillText("lsy", centerX, centerY + 24 * unit);
      ctx.font = `700 ${30 * unit}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = palette.muted;
      ctx.fillText("today in echoes", centerX, centerY + 92 * unit);
      ctx.restore();
    });

    withAlpha(ctx, inputLabelAlpha, () => {
      text("input / personal materials", inputHeaderX, inputHeaderY, 30 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
      text("film · travel · books · web · AI · life", inputHeaderX, inputHeaderY + 62 * unit, 50 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      const inputDescriptions = [
        "frames and visual rhythm",
        "routes and place notes",
        "margins and quotes",
        "agent workflow traces",
        "systems and tools",
        "recent writing output",
      ];
      inputDescriptions.forEach((description, index) => {
        const slot = inputSlot(index);
        rounded(ctx, slot.cell, 28 * unit, "rgba(255, 255, 255, 0.56)", "rgba(148, 163, 184, 0.14)");
        ctx.save();
        ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(slot.cell.x + 24 * unit, slot.cell.y + slot.cell.h - 26 * unit);
        ctx.lineTo(slot.cell.x + slot.cell.w - 24 * unit, slot.cell.y + slot.cell.h - 26 * unit);
        ctx.stroke();
        ctx.restore();
        text(description, slot.cell.x + 24 * unit, slot.cell.y + 90 * unit, 23 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      });
    });
    withAlpha(ctx, methodLabelAlpha, () => {
      text("method", methodHeaderX, methodHeaderY, 30 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
      text("observe / archive / connect / build", methodHeaderX, methodHeaderY + 62 * unit, 50 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
    });
  });

  const methodAlpha = phase(progress, 0.34, 0.46) * (1 - phase(progress, 0.72, 0.84));
  withAlpha(ctx, methodAlpha, () => {
    const verbs = ["observe", "archive", "connect", "build"];
    const descriptions = ["collect raw signals", "keep useful traces", "link patterns", "ship systems"];
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.2 * unit;
    ctx.globalAlpha *= 0.12;
    ctx.setLineDash([6 * unit, 10 * unit]);
    ctx.beginPath();
    const first = methodNode(0);
    ctx.moveTo(first.x, first.y);
    [1, 2, 3].forEach((index) => {
      const node = methodNode(index);
      ctx.lineTo(node.x, node.y);
    });
    ctx.stroke();
    ctx.restore();

    verbs.forEach((verb, index) => {
      const active = index <= Math.floor(toMethod * 3.9);
      const card = methodCards[index];
      rounded(ctx, card, 22 * unit, active ? palette.accentSoft : "rgba(255, 255, 255, 0.72)", active ? palette.line : "rgba(148, 163, 184, 0.16)");
      ctx.save();
      ctx.fillStyle = active ? palette.accent : "rgba(255, 255, 255, 0.78)";
      ctx.strokeStyle = active ? palette.line : "rgba(148, 163, 184, 0.18)";
      ctx.lineWidth = 2 * unit;
      ctx.beginPath();
      ctx.arc(card.x + card.w - 34 * unit, card.y + 34 * unit, 14 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      text(`0${index + 1}`, card.x + card.w - 72 * unit, card.y + 40 * unit, 20 * unit, active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      text(verb, card.x + 28 * unit, card.y + 44 * unit, 31 * unit, active ? palette.accent : palette.text, "'JetBrains Mono', monospace", 700);
      text(descriptions[index], card.x + 28 * unit, card.y + card.h - 18 * unit, 24 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
    });
  });

  const materials = [
    { value: "film_024.mov", active: false, angle: -2.65, slot: 0, node: 0, sub: 0 },
    { value: "Bangkok -> Penang", active: false, angle: -1.55, slot: 1, node: 0, sub: 1 },
    { value: "book margin", active: false, angle: -0.35, slot: 2, node: 1, sub: 0 },
    { value: "AI workflow", active: true, angle: 0.85, slot: 3, node: 2, sub: 0 },
    { value: "Rust tools", active: false, angle: 1.9, slot: 4, node: 2, sub: 1 },
    { value: input.postsLabel, active: false, angle: 2.75, slot: 5, node: 3, sub: 0 },
  ];
  const materialPositions = materials.map((item, index) => {
    const orbitAngle = item.angle + progress * 0.42;
    const orbitX = centerX + Math.cos(orbitAngle) * heroRect.w * 0.58 - 78 * unit;
    const orbitY = centerY + Math.sin(orbitAngle) * heroRect.h * 0.48 - 20 * unit;
    const slot = inputSlot(item.slot);
    const slotX = slot.x;
    const slotY = slot.y;
    const methodCard = methodCards[item.node];
    const methodX = methodCard.x + 28 * unit + item.sub * methodCard.w * 0.24;
    const methodY = methodCard.y + methodCard.h - 40 * unit;
    const collectedX = lerp(orbitX, slotX, gather);
    const collectedY = lerp(orbitY, slotY, gather);
    const x = lerp(collectedX, methodX, toMethod);
    const y = lerp(collectedY, methodY, toMethod);
    const scale = lerp(1, 0.48, toMethod);
    const alpha = (1 - phase(progress, 0.39, 0.46)) * (1 - phase(progress, 0.68, 0.78)) * (index === 5 ? 0.92 : 1);
    return { ...item, x, y, slotX, slotY, orbitX, orbitY, methodX, methodY, scale, alpha };
  });

  materialPositions.forEach((item) => {
    const pullAlpha = (1 - phase(progress, 0.16, 0.28)) * (1 - phase(progress, 0.42, 0.58)) * fieldAlpha;
    wire([item.orbitX + 42 * unit, item.orbitY + 18 * unit], [centerX, centerY], 1 - gather, pullAlpha);
    wire([item.orbitX + 42 * unit, item.orbitY + 18 * unit], [item.slotX + 42 * unit, item.slotY + 18 * unit], gather, pullAlpha);
  });

  materialPositions.forEach((item) => {
    chip(item.value, item.x, item.y, false, item.alpha, item.scale);
  });

  const workSourceIndexes = [2, 3, 1];
  const handoffAlpha = phase(progress, 0.52, 0.62) * (1 - phase(progress, 0.76, 0.86));
  withAlpha(ctx, handoffAlpha, () => {
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha *= 0.2;
    ctx.lineWidth = 1.5 * unit;
    ctx.setLineDash([7 * unit, 12 * unit]);
    workRows.forEach((_, index) => {
      const source = methodCards[workSourceIndexes[index]];
      const target = workRects[index];
      ctx.beginPath();
      ctx.moveTo(source.x + source.w / 2, source.y + source.h / 2);
      ctx.bezierCurveTo(
        source.x + source.w / 2,
        source.y + source.h + 70 * unit,
        target.x + target.w / 2,
        target.y - 80 * unit,
        target.x + target.w / 2,
        target.y + target.h / 2,
      );
      ctx.stroke();
    });
    ctx.restore();
  });

  withAlpha(ctx, workAlpha, () => {
    text("work", workHeaderX, workHeaderY, 28 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
    workRows.forEach((row, index) => {
      const localSplit = phase(progress, 0.56 + index * 0.025, 0.76 + index * 0.018);
      const source = methodCards[workSourceIndexes[index]];
      const origin: Rect = {
        x: source.x,
        y: source.y,
        w: source.w,
        h: source.h,
      };
      const rowRect = moveRect(origin, workRects[index], localSplit);
      workCard(rowRect, row[0], row[1], row[2], index === 1, phase(progress, 0.68 + index * 0.015, 0.78 + index * 0.015));
    });
  });

  withAlpha(ctx, todayAlpha, () => {
    const rect = moveRect(workRects[1], todayRect, todayMorph);
    rounded(ctx, rect, radius, palette.paperStrong, hairline, palette.shadow);
    const contentAlpha = phase(todayMorph, 0.32, 0.62);
    withAlpha(ctx, contentAlpha, () => {
      const pad = Math.max(42 * unit, rect.w * 0.045);
      const top = rect.y + pad;
      text("today / lsy", rect.x + pad, top, 29 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
      ctx.save();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1.4 * unit;
      ctx.beginPath();
      ctx.moveTo(rect.x + pad, top + 28 * unit);
      ctx.lineTo(rect.x + rect.w - pad, top + 28 * unit);
      ctx.stroke();
      ctx.restore();

      text("lsy", rect.x + pad, top + 122 * unit, 142 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      text(`${HOME_PROFILE.subtitle} engineer`, rect.x + pad, top + 186 * unit, 39 * unit, palette.text, "'JetBrains Mono', monospace", 700);
      text(input.stack, rect.x + pad, top + 228 * unit, 30 * unit, palette.muted, "'JetBrains Mono', monospace", 600);

      const panels = [
        ["BUILD", "Ennoia + API", "memory · stream"],
        ["WRITE", "blog.lsy22.com", "systems notes"],
        ["LIVE", "film / travel", "books · routes"],
      ] as const;
      const panelGap = 14 * unit;
      const panelW = (rect.w - pad * 2 - panelGap * 2) / 3;
      const panelH = 118 * unit;
      panels.forEach((panel, index) => {
        const panelRect = {
          x: rect.x + pad + index * (panelW + panelGap),
          y: top + 264 * unit,
          w: panelW,
          h: panelH,
        };
        rounded(ctx, panelRect, 20 * unit, index === 0 ? palette.accentSoft : palette.soft, index === 0 ? palette.line : hairline);
        text(panel[0], panelRect.x + 22 * unit, panelRect.y + 37 * unit, 23 * unit, index === 0 ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
        text(panel[1], panelRect.x + 22 * unit, panelRect.y + 76 * unit, 30 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
        text(panel[2], panelRect.x + 22 * unit, panelRect.y + 104 * unit, 21 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      });

      const statusRect = {
        x: rect.x + pad,
        y: rect.y + rect.h - 76 * unit,
        w: rect.w - pad * 2,
        h: 54 * unit,
      };
      rounded(ctx, statusRect, 23 * unit, palette.paper, hairline);
      text("local workspace · updating", statusRect.x + 22 * unit, statusRect.y + 33 * unit, 23 * unit, palette.text, "'JetBrains Mono', monospace", 700);
      const nowW = measure(input.now, 21 * unit, "'JetBrains Mono', monospace", 600);
      text(input.now, statusRect.x + statusRect.w - nowW - 22 * unit, statusRect.y + 33 * unit, 21 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
    });
  });
};

const drawDesktopStory = (
  ctx: CanvasRenderingContext2D,
  input: StoryInput,
  palette: Palette,
  progress: number,
) => {
  const { width, height } = ctx.canvas;
  const unit = clamp(Math.min(width / 1280, height / 760), 0.88, 1.2);
  const safeX = Math.max(180 * unit, width * 0.135);
  const safeRight = width - safeX;
  const safeW = safeRight - safeX;
  const stageW = Math.min(safeW, height * 1.62);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const stageX = centerX - stageW * 0.5;
  const radius = 28 * unit;
  const hairline = input.theme === "dark" ? "rgba(148, 163, 184, 0.28)" : "rgba(148, 163, 184, 0.16)";
  const quietLine = input.theme === "dark" ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.11)";
  const glass = input.theme === "dark" ? "rgba(30, 41, 59, 0.78)" : "rgba(255, 255, 255, 0.64)";
  const glassStrong = input.theme === "dark" ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.76)";
  const connector = input.theme === "dark" ? "rgba(145, 167, 255, 0.42)" : "rgba(75, 107, 255, 0.34)";

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

  const pill = (value: string, x: number, y: number, active = false, scale = 1) => {
    const size = 20 * unit * scale;
    const h = 34 * unit * scale;
    const w = measure(value, size) + 26 * unit * scale;
    rounded(
      ctx,
      { x, y, w, h },
      h / 2,
      active ? palette.accentSoft : glassStrong,
      active ? palette.line : hairline,
    );
    text(value, x + 13 * unit * scale, y + 23 * unit * scale, size, active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
    return w;
  };

  const stageHeader = (label: string, title: string, alpha: number, y = height * 0.265, x = stageX) => {
    withAlpha(ctx, alpha, () => {
      text(label, x, y, 29 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
      text(title, x, y + 58 * unit, 48 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
    });
  };

  const curvedConnector = (fromX: number, fromY: number, toX: number, toY: number, alpha: number) => {
    withAlpha(ctx, alpha, () => {
      ctx.save();
      ctx.strokeStyle = connector;
      ctx.globalAlpha *= input.theme === "dark" ? 0.95 : 0.86;
      ctx.lineWidth = 2.1 * unit;
      ctx.setLineDash([7 * unit, 9 * unit]);
      const midX = (fromX + toX) / 2;
      const bend = (toY - fromY) * 0.18;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(midX, fromY + bend, midX, toY - bend, toX, toY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = connector;
      ctx.beginPath();
      ctx.arc(toX, toY, 3.2 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const materials = [
    { tag: "film_024.mov", body: "frames and visual rhythm", group: 0, active: false, angle: -2.65 },
    { tag: "Bangkok -> Penang", body: "routes and place notes", group: 0, active: false, angle: -1.55 },
    { tag: "AI workflow", body: "agent workflow traces", group: 1, active: true, angle: 0.85 },
    { tag: "Rust tools", body: "systems and tools", group: 1, active: false, angle: 1.9 },
    { tag: "book margin", body: "margins and quotes", group: 2, active: false, angle: -0.35 },
    { tag: input.postsLabel, body: "recent writing output", group: 2, active: false, angle: 2.75 },
  ];

  const mindOffsets = [
    { x: -stageW * 0.31, y: -height * 0.15 },
    { x: stageW * 0.29, y: -height * 0.17 },
    { x: -stageW * 0.27, y: height * 0.09 },
    { x: stageW * 0.24, y: height * 0.07 },
    { x: -stageW * 0.25, y: height * 0.25 },
    { x: stageW * 0.25, y: height * 0.25 },
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
  const trackH = 318 * unit;
  const trackY = centerY - 118 * unit;
  const tracks = [
    { label: "culture", title: "film / travel", note: "visual memory" },
    { label: "systems", title: "AI / Rust", note: "tools and agents" },
    { label: "writing", title: "books / notes", note: "public traces" },
  ];
  const trackRects = tracks.map((_, index) => ({
    x: trackX + index * (trackW + trackGap),
    y: trackY,
    w: trackW,
    h: trackH,
  }));

  const groupOrders = [0, 0, 1, 1, 2, 2];
  const groupIndexes = [0, 1, 0, 1, 0, 1];
  const trackSlot = (index: number): Rect => {
    const track = trackRects[groupOrders[index]];
    const slotH = 78 * unit;
    return {
      x: track.x + 22 * unit,
      y: track.y + 128 * unit + groupIndexes[index] * (slotH + 16 * unit),
      w: track.w - 44 * unit,
      h: slotH,
    };
  };

  const workRows = [
    { label: "system", title: "Ennoia", body: "memory / tools / permission", from: 1, active: false },
    { label: "api", title: "API Worker", body: "protocol / stream / fallback", from: 2, active: true },
    { label: "product", title: "真留平台", body: "mentor / search / chat", from: 0, active: false },
  ];
  const workGap = stageW * 0.027;
  const workAreaW = stageW * 0.84;
  const workX = centerX - workAreaW / 2;
  const workW = (workAreaW - workGap * 2) / 3;
  const workH = clamp(height * 0.34, 275 * unit, 335 * unit);
  const workRects = workRows.map((_, index) => ({
    x: workX + index * (workW + workGap),
    y: centerY - workH * 0.44,
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

  const gather = phase(progress, 0.06, 0.2);
  const classify = phase(progress, 0.28, 0.52);
  const build = phase(progress, 0.5, 0.78);
  const todayMorph = phase(progress, 0.82, 0.98);
  const fieldAlpha = 1 - phase(progress, 0.9, 0.98);

  const introAlpha = 1 - phase(progress, 0.08, 0.2);
  const inputHeaderAlpha = phase(progress, 0.12, 0.22) * (1 - phase(progress, 0.32, 0.44));
  const classifyAlpha = phase(progress, 0.3, 0.42) * (1 - phase(progress, 0.5, 0.62));
  const workAlpha = phase(progress, 0.48, 0.56) * (1 - phase(progress, 0.91, 0.97));
  const workHeaderAlpha = phase(progress, 0.7, 0.78) * (1 - phase(progress, 0.91, 0.97));
  const todayAlpha = phase(progress, 0.82, 0.88);

  const drawMaterialCard = (
    rect: Rect,
    item: (typeof materials)[number],
    compact: number,
    alpha: number,
    detailReveal = 1,
  ) => {
    withAlpha(ctx, alpha, () => {
      const pad = lerp(24 * unit, 18 * unit, compact);
      const basePillScale = lerp(1, 0.72, compact);
      const bodySize = lerp(23 * unit, 18 * unit, compact);
      const detailAlpha = detailReveal * clamp((rect.h - 104 * unit) / (24 * unit));
      const basePillW = measure(item.tag, 20 * unit * basePillScale) + 26 * unit * basePillScale;
      const pillScale = Math.min(basePillScale, Math.max(0.58, (rect.w - pad * 2) / Math.max(1, basePillW)) * basePillScale);
      const pillW = measure(item.tag, 20 * unit * pillScale) + 26 * unit * pillScale;
      const pillH = 34 * unit * pillScale;
      const isTinyCard = detailAlpha < 0.12;
      const pillX = isTinyCard ? rect.x + (rect.w - pillW) / 2 : rect.x + pad;
      const pillY = isTinyCard ? rect.y + (rect.h - pillH) / 2 : rect.y + pad * 0.75;
      rounded(ctx, rect, lerp(28 * unit, 18 * unit, compact), isTinyCard ? glass : glassStrong, hairline);
      pill(item.tag, pillX, pillY, item.active, pillScale);
      withAlpha(ctx, detailAlpha, () => {
        text(item.body, rect.x + pad, rect.y + rect.h - lerp(24 * unit, 18 * unit, compact), bodySize, palette.muted, "'JetBrains Mono', monospace", 600);
        ctx.save();
        ctx.strokeStyle = quietLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rect.x + pad, rect.y + rect.h - lerp(38 * unit, 28 * unit, compact));
        ctx.lineTo(rect.x + rect.w - pad, rect.y + rect.h - lerp(38 * unit, 28 * unit, compact));
        ctx.stroke();
        ctx.restore();
      });
      if (compact > 0.55) {
        const tagSize = 18 * unit;
        text(tracks[item.group].label, rect.x + rect.w - pad - measure(tracks[item.group].label, tagSize, "'JetBrains Mono', monospace", 700), rect.y + pad + 10 * unit, tagSize, palette.quiet, "'JetBrains Mono', monospace", 700);
      }
    });
  };

  const drawTrack = (rect: Rect, track: (typeof tracks)[number], index: number, alpha: number) => {
    withAlpha(ctx, alpha, () => {
      rounded(ctx, rect, radius, index === 1 ? palette.accentSoft : glass, index === 1 ? palette.line : hairline);
      const pad = 24 * unit;
      text(track.label, rect.x + pad, rect.y + 40 * unit, 24 * unit, index === 1 ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      text(track.title, rect.x + pad, rect.y + 78 * unit, 31 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      text(track.note, rect.x + pad, rect.y + 108 * unit, 19 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
    });
  };

  const drawWorkCard = (rect: Rect, row: (typeof workRows)[number], alpha: number) => {
    withAlpha(ctx, alpha, () => {
      rounded(ctx, rect, radius, row.active ? palette.accentSoft : palette.paperStrong, row.active ? palette.line : hairline, palette.shadow);
      const pad = 34 * unit;
      text(row.label, rect.x + pad, rect.y + 42 * unit, 23 * unit, row.active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
      text(row.title, rect.x + pad, rect.y + 106 * unit, clamp(rect.w * 0.15, 44 * unit, 64 * unit), palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      const bodyParts = row.body.split(" / ");
      text(bodyParts.slice(0, 2).join(" / "), rect.x + pad, rect.y + 148 * unit, 23 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      if (bodyParts.length > 2) {
        text(bodyParts.slice(2).join(" / "), rect.x + pad, rect.y + 178 * unit, 22 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      }
      const details =
        row.label === "system"
          ? ["agent memory layers", "tool execution boundary"]
          : row.label === "api"
            ? ["multi-model gateway", "stream protocol bridge"]
            : ["mentor discovery", "consultation workflow"];
      details.forEach((detail, index) => {
        text(detail, rect.x + pad, rect.y + 218 * unit + index * 28 * unit, 19 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      });
      const chips =
        row.label === "system" ? ["memory", "sandbox"] : row.label === "api" ? ["workers", "stream"] : ["mentor", "search"];
      chips.forEach((chipLabel, index) => {
        pill(chipLabel, rect.x + pad + index * rect.w * 0.28, rect.y + rect.h - 42 * unit, row.active && index === 0, 0.78);
      });
    });
  };

  const drawBuildMorphCard = (
    rect: Rect,
    row: (typeof workRows)[number],
    sourceTrack: (typeof tracks)[number],
    amount: number,
    alpha: number,
  ) => {
    withAlpha(ctx, alpha, () => {
      const trackTextAlpha = 1 - phase(amount, 0.08, 0.36);
      const workTextAlpha = phase(amount, 0.32, 0.72);
      const fill = amount > 0.56 && row.active ? palette.accentSoft : amount > 0.56 ? palette.paperStrong : row.active ? palette.accentSoft : glass;
      const stroke = row.active ? palette.line : hairline;
      rounded(ctx, rect, lerp(radius, radius * 0.92, amount), fill, stroke, amount > 0.5 ? palette.shadow : "");

      const pad = lerp(24 * unit, 34 * unit, amount);
      withAlpha(ctx, trackTextAlpha, () => {
        text(sourceTrack.label, rect.x + pad, rect.y + 40 * unit, 24 * unit, row.active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
        text(sourceTrack.title, rect.x + pad, rect.y + 78 * unit, 31 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
        text(sourceTrack.note, rect.x + pad, rect.y + 108 * unit, 19 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      });

      withAlpha(ctx, workTextAlpha, () => {
        text(row.label, rect.x + pad, rect.y + 42 * unit, 23 * unit, row.active ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
        text(row.title, rect.x + pad, rect.y + 106 * unit, clamp(rect.w * 0.15, 44 * unit, 64 * unit), palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
        const bodyParts = row.body.split(" / ");
        text(bodyParts.slice(0, 2).join(" / "), rect.x + pad, rect.y + 148 * unit, 23 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
        if (bodyParts.length > 2) {
          text(bodyParts.slice(2).join(" / "), rect.x + pad, rect.y + 178 * unit, 22 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
        }
        const details =
          row.label === "system"
            ? ["agent memory layers", "tool execution boundary"]
            : row.label === "api"
              ? ["multi-model gateway", "stream protocol bridge"]
              : ["mentor discovery", "consultation workflow"];
        details.forEach((detail, index) => {
          text(detail, rect.x + pad, rect.y + 218 * unit + index * 28 * unit, 19 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
        });
        const chips =
          row.label === "system" ? ["memory", "sandbox"] : row.label === "api" ? ["workers", "stream"] : ["mentor", "search"];
        chips.forEach((chipLabel, index) => {
          pill(chipLabel, rect.x + pad + index * rect.w * 0.28, rect.y + rect.h - 42 * unit, row.active && index === 0, 0.78);
        });
      });
    });
  };

  withAlpha(ctx, fieldAlpha, () => {
    withAlpha(ctx, introAlpha, () => {
      const ringProgress = phase(progress, 0.02, 0.16);
      ctx.save();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1.3 * unit;
      ctx.globalAlpha *= 0.72;
      ctx.beginPath();
      ctx.arc(centerX, centerY - height * 0.01, lerp(96 * unit, 168 * unit, ringProgress), -Math.PI * 0.18, Math.PI * 1.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY - height * 0.01, lerp(138 * unit, 218 * unit, ringProgress), Math.PI * 0.82, Math.PI * 1.86);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = palette.text;
      ctx.font = `500 ${184 * unit}px 'Fraunces', 'Noto Serif SC', serif`;
      ctx.fillText("lsy", centerX, centerY + 24 * unit);
      ctx.font = `700 ${30 * unit}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = palette.muted;
      ctx.fillText("today in echoes", centerX, centerY + 92 * unit);
      ctx.restore();
    });

    stageHeader("input / personal materials", "film · travel · books · web · AI · life", inputHeaderAlpha, height * 0.265, inputAreaX);
    stageHeader("classify / three lanes", "culture / systems / writing", classifyAlpha, height * 0.265, trackX);
    stageHeader("work", "things built from those lanes", workHeaderAlpha, height * 0.245, workX);

    trackRects.forEach((rect, index) => drawTrack(rect, tracks[index], index, classifyAlpha));

    const materialAlpha = (1 - phase(progress, 0.48, 0.62)) * fieldAlpha;
    const relationAlpha = (1 - phase(progress, 0.13, 0.28)) * (1 - classify);
    materials.forEach((item, index) => {
      const offset = mindOffsets[index];
      const orbitAngle = item.angle + progress * 0.42;
      const orbitW = inputCardW * 0.46;
      const orbitH = inputCardH * 0.62;
      const orbit: Rect = {
        x: clamp(centerX + offset.x + Math.cos(orbitAngle) * stageW * 0.015 - orbitW / 2, safeX, safeRight - orbitW),
        y: centerY + offset.y + Math.sin(orbitAngle) * height * 0.018 - orbitH / 2,
        w: orbitW,
        h: orbitH,
      };
      const collected = moveRect(orbit, inputRects[index], gather);
      const rect = moveRect(collected, trackSlot(index), classify);
      curvedConnector(centerX, centerY - height * 0.01, rect.x + rect.w / 2, rect.y + rect.h / 2, relationAlpha);
      drawMaterialCard(rect, item, classify, materialAlpha, phase(gather, 0.78, 1));
    });

    const handoffAlpha = phase(progress, 0.5, 0.58) * (1 - phase(progress, 0.66, 0.76));
    withAlpha(ctx, handoffAlpha, () => {
      ctx.save();
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha *= 0.22;
      ctx.lineWidth = 1.5 * unit;
      ctx.setLineDash([7 * unit, 12 * unit]);
      workRows.forEach((row, index) => {
        const source = trackRects[row.from];
        const target = workRects[index];
        ctx.beginPath();
        ctx.moveTo(source.x + source.w / 2, source.y + source.h * 0.58);
        ctx.bezierCurveTo(
          source.x + source.w / 2,
          source.y + source.h + 80 * unit,
          target.x + target.w / 2,
          target.y - 80 * unit,
          target.x + target.w / 2,
          target.y + target.h / 2,
        );
        ctx.stroke();
      });
      ctx.restore();
    });

    withAlpha(ctx, workAlpha, () => {
      workRows.forEach((row, index) => {
        const source = trackRects[row.from];
        const origin: Rect = source;
        const rect = moveRect(origin, workRects[index], build);
        drawBuildMorphCard(rect, row, tracks[row.from], build, 1);
      });
    });
  });

  withAlpha(ctx, todayAlpha, () => {
    const rect = moveRect(workRects[1], todayRect, todayMorph);
    rounded(ctx, rect, radius, palette.paperStrong, "rgba(148, 163, 184, 0.16)", palette.shadow);
    const contentAlpha = phase(todayMorph, 0.32, 0.62);
    withAlpha(ctx, contentAlpha, () => {
      const pad = Math.max(42 * unit, rect.w * 0.045);
      const top = rect.y + pad;
      text("today / lsy", rect.x + pad, top, 29 * unit, palette.accent, "'JetBrains Mono', monospace", 700);
      ctx.save();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1.4 * unit;
      ctx.beginPath();
      ctx.moveTo(rect.x + pad, top + 28 * unit);
      ctx.lineTo(rect.x + rect.w - pad, top + 28 * unit);
      ctx.stroke();
      ctx.restore();

      text("lsy", rect.x + pad, top + 122 * unit, 142 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
      text(`${HOME_PROFILE.subtitle} engineer`, rect.x + pad, top + 186 * unit, 39 * unit, palette.text, "'JetBrains Mono', monospace", 700);
      text(input.stack, rect.x + pad, top + 228 * unit, 30 * unit, palette.muted, "'JetBrains Mono', monospace", 600);

      const panels = [
        ["BUILD", "Ennoia + API", "memory · stream"],
        ["WRITE", "blog.lsy22.com", "systems notes"],
        ["LIVE", "film / travel", "books · routes"],
      ] as const;
      const panelGap = 14 * unit;
      const panelW = (rect.w - pad * 2 - panelGap * 2) / 3;
      const panelH = 118 * unit;
      panels.forEach((panel, index) => {
        const panelRect = {
          x: rect.x + pad + index * (panelW + panelGap),
          y: top + 264 * unit,
          w: panelW,
          h: panelH,
        };
        rounded(ctx, panelRect, 20 * unit, index === 0 ? palette.accentSoft : palette.soft, index === 0 ? palette.line : "rgba(148, 163, 184, 0.14)");
        text(panel[0], panelRect.x + 22 * unit, panelRect.y + 37 * unit, 23 * unit, index === 0 ? palette.accent : palette.muted, "'JetBrains Mono', monospace", 700);
        text(panel[1], panelRect.x + 22 * unit, panelRect.y + 76 * unit, 30 * unit, palette.text, "'Fraunces', 'Noto Serif SC', serif", 600);
        text(panel[2], panelRect.x + 22 * unit, panelRect.y + 104 * unit, 21 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
      });

      const statusRect = {
        x: rect.x + pad,
        y: rect.y + rect.h - 68 * unit,
        w: rect.w - pad * 2,
        h: 50 * unit,
      };
      rounded(ctx, statusRect, 23 * unit, palette.paper, "rgba(148, 163, 184, 0.14)");
      text("local workspace · updating", statusRect.x + 22 * unit, statusRect.y + 30 * unit, 24 * unit, palette.text, "'JetBrains Mono', monospace", 700);
      const nowW = measure(input.now, 22 * unit, "'JetBrains Mono', monospace", 600);
      text(input.now, statusRect.x + statusRect.w - nowW - 22 * unit, statusRect.y + 30 * unit, 22 * unit, palette.muted, "'JetBrains Mono', monospace", 600);
    });
  });

};

export const drawHomeScreenStory = (ctx: CanvasRenderingContext2D, input: StoryInput) => {
  const { width, height } = ctx.canvas;
  const palette = PALETTES[input.theme];
  const progress = clamp(input.progress);
  if (input.device === "mobile") {
    drawBackground(ctx, palette, progress);
    drawMobileStory(ctx, input, palette, progress);
    return;
  }

  drawBackground(ctx, palette, progress);
  drawDesktopStory(ctx, input, palette, progress);
};

export const drawHomeScreenBackdrop = (
  ctx: CanvasRenderingContext2D,
  input: Pick<StoryInput, "theme" | "progress">,
) => {
  const palette = PALETTES[input.theme];
  drawBackground(ctx, palette, clamp(input.progress));
};
