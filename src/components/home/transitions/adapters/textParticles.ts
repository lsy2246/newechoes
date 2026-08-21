import {
  beginTransitionFrame,
  clampTransitionProgress,
  createTransitionPrng,
  drawTransitionSnapshot,
  endTransitionFrame,
  transitionPhase,
  type TransitionAdapter,
  type TransitionContext2D,
  type TransitionDevice,
  type TransitionSnapshot,
  type TransitionTheme,
} from "../types.ts";
import type { HomeMotionOperation } from "../../homeMotionPlan.ts";
import type { HomeStorySceneRect } from "../../homeStoryTypes.ts";

export const TEXT_PARTICLE_BUDGET_DESKTOP = 2_400;
export const TEXT_PARTICLE_BUDGET_MOBILE = 720;
export const TEXT_PARTICLE_SCAN_START = 0.06;
export const TEXT_PARTICLE_SCAN_END = 0.94;
export const TEXT_PARTICLE_SCAN_LINE_WIDTH_DESKTOP = 1.4;
export const TEXT_PARTICLE_SCAN_LINE_WIDTH_MOBILE = 1.1;

export const textParticleScanProgress = (progress: number) =>
  transitionPhase(
    clampTransitionProgress(progress),
    TEXT_PARTICLE_SCAN_START,
    TEXT_PARTICLE_SCAN_END,
  );

type Pixel = Readonly<{ r: number; g: number; b: number; a: number }>;
type PixelPoint = Readonly<{ x: number; y: number; color: Pixel }>;

type PreparedTextParticle = Readonly<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromColor: Pixel;
  toColor: Pixel;
  size: number;
  delay: number;
  drift: number;
  accent: boolean;
}>;

export type TextParticlesTransitionState = Readonly<{
  width: number;
  height: number;
  band: number;
  lineTop: number;
  lineBottom: number;
  direction: -1 | 1;
  particles: readonly PreparedTextParticle[];
}>;

const createSamplingSurface = (width: number, height: number) => {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    return ctx ? { canvas, ctx } : null;
  }
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return ctx ? { canvas, ctx } : null;
};

const samplingSize = (width: number, height: number, device: TransitionDevice) => {
  const maxDimension = device === "mobile" ? 640 : 960;
  const scale = Math.min(1, maxDimension / Math.max(1, width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const readSnapshot = (
  snapshot: TransitionSnapshot,
  width: number,
  height: number,
) => {
  const surface = createSamplingSurface(width, height);
  if (!surface) return null;
  try {
    surface.ctx.clearRect(0, 0, width, height);
    surface.ctx.drawImage(snapshot, 0, 0, width, height);
    return surface.ctx.getImageData(0, 0, width, height);
  } catch {
    return null;
  }
};

const pixelAt = (image: ImageData, x: number, y: number): Pixel => {
  const safeX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const offset = (safeY * image.width + safeX) * 4;
  return {
    r: image.data[offset] ?? 0,
    g: image.data[offset + 1] ?? 0,
    b: image.data[offset + 2] ?? 0,
    a: (image.data[offset + 3] ?? 0) / 255,
  };
};

const background = (theme: TransitionTheme): Pixel =>
  theme === "dark"
    ? { r: 17, g: 19, b: 21, a: 1 }
    : { r: 255, g: 255, b: 255, a: 1 };

const colorDistance = (from: Pixel, to: Pixel) =>
  Math.hypot(from.r - to.r, from.g - to.g, from.b - to.b);

const sampleRect = (
  image: ImageData,
  rect: HomeStorySceneRect | undefined,
  theme: TransitionTheme,
  device: TransitionDevice,
) => {
  if (!rect) return [];
  const bg = background(theme);
  const x0 = Math.max(0, Math.floor(rect.x * image.width));
  const y0 = Math.max(0, Math.floor(rect.y * image.height));
  const x1 = Math.min(image.width, Math.ceil((rect.x + rect.width) * image.width));
  const y1 = Math.min(image.height, Math.ceil((rect.y + rect.height) * image.height));
  const stride = device === "mobile" ? 3 : 2;
  const points: PixelPoint[] = [];

  for (let y = y0; y < y1; y += stride) {
    for (let x = x0; x < x1; x += stride) {
      const color = pixelAt(image, x, y);
      if (color.a < 0.2 || colorDistance(color, bg) < 42) continue;
      points.push({ x, y, color });
    }
  }
  return points;
};

const evenlyLimit = (points: readonly PixelPoint[], count: number) => {
  if (count <= 0 || points.length === 0) return [];
  if (points.length <= count) return [...points];
  const selected: PixelPoint[] = [];
  const step = points.length / count;
  for (let index = 0; index < count; index += 1) {
    selected.push(points[Math.min(points.length - 1, Math.floor(index * step))]!);
  }
  return selected;
};

const outputPoint = (
  point: PixelPoint,
  image: ImageData,
  width: number,
  height: number,
) => ({
  x: (point.x / image.width) * width,
  y: (point.y / image.height) * height,
});

const transparentPixel = (theme: TransitionTheme): Pixel => ({
  ...background(theme),
  a: 0,
});

const scanLineRange = (
  operations: readonly HomeMotionOperation[],
  height: number,
  device: TransitionDevice,
) => {
  const verticalOffset = device === "mobile" ? 0.018 : 0.035;
  const rects = operations.flatMap((operation) =>
    [operation.from, operation.to].filter(
      (rect): rect is HomeStorySceneRect => Boolean(rect),
    ),
  );
  if (!rects.length) {
    return {
      lineTop: height * ((device === "mobile" ? 0.08 : 0.14) + verticalOffset),
      lineBottom: height * ((device === "mobile" ? 0.9 : 0.78) + verticalOffset),
    };
  }
  const padding = device === "mobile" ? 0.025 : 0.035;
  const top = Math.min(...rects.map((rect) => rect.y));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    lineTop: clampTransitionProgress(top - padding + verticalOffset) * height,
    lineBottom: clampTransitionProgress(bottom + padding + verticalOffset) * height,
  };
};

const collectOperationParticles = (
  operation: HomeMotionOperation,
  fromImage: ImageData,
  toImage: ImageData,
  width: number,
  height: number,
  theme: TransitionTheme,
  device: TransitionDevice,
  allowance: number,
  random: () => number,
) => {
  const fromSamples = sampleRect(fromImage, operation.from, theme, device);
  const toSamples = sampleRect(toImage, operation.to, theme, device);
  const count = Math.min(allowance, Math.max(fromSamples.length, toSamples.length));
  if (count <= 0) return [];
  const from = evenlyLimit(fromSamples, Math.min(count, fromSamples.length));
  const to = evenlyLimit(toSamples, Math.min(count, toSamples.length));
  const fromCenter = operation.from
    ? {
        x: (operation.from.x + operation.from.width * 0.5) * width,
        y: (operation.from.y + operation.from.height * 0.5) * height,
      }
    : { x: width * 0.5, y: height * 0.5 };
  const toCenter = operation.to
    ? {
        x: (operation.to.x + operation.to.width * 0.5) * width,
        y: (operation.to.y + operation.to.height * 0.5) * height,
      }
    : { x: width * 0.5, y: height * 0.5 };
  const quiet = transparentPixel(theme);

  return Array.from({ length: count }, (_, index): PreparedTextParticle => {
    const fromSample = from.length ? from[index % from.length]! : null;
    const toSample = to.length ? to[index % to.length]! : null;
    const fromPoint = fromSample
      ? outputPoint(fromSample, fromImage, width, height)
      : fromCenter;
    const toPoint = toSample
      ? outputPoint(toSample, toImage, width, height)
      : toCenter;
    const accent = random() < 0.09 && operation.priority >= 0.8;
    return Object.freeze({
      fromX: fromPoint.x,
      fromY: fromPoint.y,
      toX: toPoint.x,
      toY: toPoint.y,
      fromColor: fromSample?.color ?? quiet,
      toColor: toSample?.color ?? quiet,
      size: random() < 0.82 ? 1.8 + random() * 0.8 : 3 + random() * 1.2,
      delay: operation.delay * 0.35 + (random() - 0.5) * 0.025,
      drift: (random() - 0.5) * (device === "mobile" ? 6 : 10),
      accent,
    });
  });
};

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const cssColor = (color: Pixel) =>
  `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;

const drawFeatherStrip = (
  ctx: TransitionContext2D,
  snapshot: TransitionSnapshot,
  width: number,
  height: number,
  x: number,
  stripWidth: number,
  alpha: number,
) => {
  const left = Math.max(0, x);
  const right = Math.min(width, x + stripWidth);
  if (right <= left || alpha <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, 0, right - left, height);
  ctx.clip();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(snapshot, 0, 0, width, height);
  ctx.restore();
};

const drawTextParticleScanLine = (
  ctx: TransitionContext2D,
  frontier: number,
  progress: number,
  width: number,
  lineTop: number,
  lineBottom: number,
  pointScale: number,
  device: TransitionDevice,
  theme: TransitionTheme,
) => {
  if (frontier <= 0 || frontier >= width) return;
  const enter = transitionPhase(progress, TEXT_PARTICLE_SCAN_START, 0.12);
  const exit = 1 - transitionPhase(progress, 0.88, TEXT_PARTICLE_SCAN_END);
  const visibility = Math.min(enter, exit);
  if (visibility <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = visibility * (theme === "dark" ? 0.82 : 0.68);
  ctx.strokeStyle = theme === "dark" ? "#b8aadf" : "#6f5fa6";
  ctx.lineWidth = Math.max(
    1,
    (device === "mobile"
      ? TEXT_PARTICLE_SCAN_LINE_WIDTH_MOBILE
      : TEXT_PARTICLE_SCAN_LINE_WIDTH_DESKTOP) * pointScale,
  );
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(frontier, lineTop);
  ctx.lineTo(frontier, lineBottom);
  ctx.stroke();
  ctx.restore();
};

export const textParticlesAdapter: TransitionAdapter<TextParticlesTransitionState> = {
  id: "text-particles",

  prepare(input) {
    const sampleSize = samplingSize(input.width, input.height, input.device);
    const fromImage = readSnapshot(input.from, sampleSize.width, sampleSize.height);
    const toImage = readSnapshot(input.to, sampleSize.width, sampleSize.height);
    const budget = input.device === "mobile"
      ? TEXT_PARTICLE_BUDGET_MOBILE
      : TEXT_PARTICLE_BUDGET_DESKTOP;
    const operations = input.motionPlan
      ? input.motionPlan.operations.filter(
          (operation) => operation.from || operation.to,
        )
      : [];
    const lineRange = scanLineRange(
      operations,
      input.height,
      input.device,
    );
    if (!fromImage || !toImage || !input.motionPlan) {
      return Object.freeze({
        width: input.width,
        height: input.height,
        band: input.device === "mobile" ? 38 : 58,
        ...lineRange,
        direction: input.motionPlan?.direction ?? 1,
        particles: Object.freeze([]),
      });
    }

    const priorityTotal = operations.reduce(
      (sum, operation) => sum + Math.max(0.25, operation.priority),
      0,
    );
    const random = createTransitionPrng(input.seed, "text-particles/real-glyph-pixels");
    const prepared = operations.flatMap((operation) =>
      collectOperationParticles(
        operation,
        fromImage,
        toImage,
        input.width,
        input.height,
        input.theme,
        input.device,
        Math.max(
          24,
          Math.floor(
            budget * (Math.max(0.25, operation.priority) / Math.max(1, priorityTotal)),
          ),
        ),
        random,
      ),
    ).slice(0, budget);

    return Object.freeze({
      width: input.width,
      height: input.height,
      band: input.device === "mobile" ? 38 : 58,
      ...lineRange,
      direction: input.motionPlan.direction,
      particles: Object.freeze(prepared),
    });
  },

  render(input) {
    const { ctx, state, width, height } = input;
    const progress = clampTransitionProgress(input.progress);
    beginTransitionFrame(ctx, width, height);
    if (progress <= 0) {
      drawTransitionSnapshot(ctx, input.from, width, height);
      endTransitionFrame(ctx);
      return;
    }
    if (progress >= 1) {
      drawTransitionSnapshot(ctx, input.to, width, height);
      endTransitionFrame(ctx);
      return;
    }

    const scaleX = width / Math.max(1, state.width);
    const scaleY = height / Math.max(1, state.height);
    const pointScale = Math.min(scaleX, scaleY);
    const band = state.band * pointScale;
    const scan = textParticleScanProgress(progress);
    const frontier = state.direction > 0
      ? mix(-band, width + band, scan)
      : mix(width + band, -band, scan);

    if (state.particles.length === 0) {
      drawTransitionSnapshot(ctx, input.from, width, height, 1 - scan);
      drawTransitionSnapshot(ctx, input.to, width, height, scan);
      drawTextParticleScanLine(
        ctx,
        frontier,
        progress,
        width,
        state.lineTop * scaleY,
        state.lineBottom * scaleY,
        pointScale,
        input.device,
        input.theme,
      );
      endTransitionFrame(ctx);
      return;
    }

    // The scan has a real reaction band: target and source snapshots stop on
    // opposite sides of it, while only sampled glyph particles may occupy the
    // centre. There is no hard new/old seam hidden behind the particles.
    ctx.fillStyle = input.theme === "dark" ? "#111315" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const rebuiltEdge = state.direction > 0 ? frontier - band : frontier + band;
    const sourceEdge = state.direction > 0 ? frontier + band : frontier - band;

    ctx.save();
    ctx.beginPath();
    if (state.direction > 0) {
      ctx.rect(0, 0, Math.max(0, Math.min(width, rebuiltEdge)), height);
    } else {
      const x = Math.max(0, Math.min(width, rebuiltEdge));
      ctx.rect(x, 0, width - x, height);
    }
    ctx.clip();
    ctx.drawImage(input.to, 0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    if (state.direction > 0) {
      const x = Math.max(0, Math.min(width, sourceEdge));
      ctx.rect(x, 0, width - x, height);
    } else {
      ctx.rect(0, 0, Math.max(0, Math.min(width, sourceEdge)), height);
    }
    ctx.clip();
    ctx.drawImage(input.from, 0, 0, width, height);
    ctx.restore();

    // Four local opacity steps dissolve intact source pixels into the scan and
    // condense target pixels out of it. The feather is confined to the band;
    // complete page snapshots never overlap.
    const featherSteps = 4;
    const stripWidth = band / featherSteps;
    for (let step = 0; step < featherSteps; step += 1) {
      const lowToHigh = (step + 0.5) / featherSteps;
      if (state.direction > 0) {
        drawFeatherStrip(
          ctx,
          input.to,
          width,
          height,
          frontier - band + step * stripWidth,
          stripWidth,
          1 - lowToHigh,
        );
        drawFeatherStrip(
          ctx,
          input.from,
          width,
          height,
          frontier + step * stripWidth,
          stripWidth,
          lowToHigh,
        );
      } else {
        drawFeatherStrip(
          ctx,
          input.from,
          width,
          height,
          frontier - band + step * stripWidth,
          stripWidth,
          1 - lowToHigh,
        );
        drawFeatherStrip(
          ctx,
          input.to,
          width,
          height,
          frontier + step * stripWidth,
          stripWidth,
          lowToHigh,
        );
      }
    }

    const accentColor = input.theme === "dark"
      ? { r: 184, g: 170, b: 223, a: 1 }
      : { r: 111, g: 95, b: 166, a: 1 };

    for (const particle of state.particles) {
      const sourceX = particle.fromX * scaleX;
      const sourceY = particle.fromY * scaleY;
      const targetX = particle.toX * scaleX;
      const targetY = particle.toY * scaleY;
      const anchorX = mix(sourceX, targetX, 0.5);
      const signedDistance = (anchorX - frontier) * state.direction;
      if (Math.abs(signedDistance) >= band) continue;
      const local = clampTransitionProgress(
        (band - signedDistance) / Math.max(1, band * 2),
      );
      const pulse = Math.pow(Math.sin(Math.PI * local), 0.72);
      if (pulse <= 0.002) continue;
      const x = mix(sourceX, targetX, local) + state.direction * pulse * 4 * pointScale;
      const y = mix(sourceY, targetY, local) + particle.drift * pointScale * pulse;
      const color = particle.accent
        ? accentColor
        : {
            r: mix(particle.fromColor.r, particle.toColor.r, local),
            g: mix(particle.fromColor.g, particle.toColor.g, local),
            b: mix(particle.fromColor.b, particle.toColor.b, local),
            a: mix(particle.fromColor.a, particle.toColor.a, local),
          };
      const sampledAlpha = particle.accent
        ? Math.max(particle.fromColor.a, particle.toColor.a)
        : color.a * 0.94;
      const alpha = clampTransitionProgress(pulse * sampledAlpha);
      if (alpha <= 0.003) continue;
      const size = particle.size * pointScale;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cssColor(color);
      ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
    }

    // The line is the scan head, not a separate animation. Drawing it last
    // keeps the direction readable without changing the particle topology.
    drawTextParticleScanLine(
      ctx,
      frontier,
      progress,
      width,
      state.lineTop * scaleY,
      state.lineBottom * scaleY,
      pointScale,
      input.device,
      input.theme,
    );

    endTransitionFrame(ctx);
  },
};
