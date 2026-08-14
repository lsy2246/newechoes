import {
  beginTransitionFrame,
  clampTransitionProgress,
  createTransitionPrng,
  drawTransitionSnapshot,
  endTransitionFrame,
  transitionPhase,
  type TransitionAdapter,
  type TransitionDevice,
  type TransitionPoint,
  type TransitionSnapshot,
  type TransitionTheme,
} from "../types.ts";

// These are preparation budgets, not simultaneous on-screen counts. Only the
// narrow reaction band around the moving frontier is rendered each frame.
export const PARTICLE_BUDGET_DESKTOP = 5_600;
export const PARTICLE_BUDGET_MOBILE = 1_200;

type PixelColor = Readonly<{
  r: number;
  g: number;
  b: number;
  a: number;
}>;

type ParticleSample = Readonly<{
  anchor: TransitionPoint;
  fromColor: PixelColor;
  toColor: PixelColor;
  importance: number;
  guide: boolean;
}>;

type PreparedParticle = ParticleSample &
  Readonly<{
    size: number;
    normalKick: number;
    tangentCurl: number;
    phase: number;
    accent: boolean;
  }>;

export type ParticlesTransitionState = Readonly<{
  width: number;
  height: number;
  budget: number;
  halfBand: number;
  amplitude: number;
  segments: number;
  direction: -1 | 1;
  particles: readonly PreparedParticle[];
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

const pixelAt = (image: ImageData, x: number, y: number): PixelColor => {
  const safeX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const index = (safeY * image.width + safeX) * 4;
  return {
    r: image.data[index] ?? 0,
    g: image.data[index + 1] ?? 0,
    b: image.data[index + 2] ?? 0,
    a: (image.data[index + 3] ?? 0) / 255,
  };
};

const colorDistance = (left: PixelColor, right: PixelColor) =>
  Math.hypot(
    left.r - right.r,
    left.g - right.g,
    left.b - right.b,
    (left.a - right.a) * 255,
  );

const fallbackBackground = (theme: TransitionTheme): PixelColor =>
  theme === "dark"
    ? { r: 17, g: 19, b: 21, a: 1 }
    : { r: 255, g: 255, b: 255, a: 1 };

const backgroundColor = (image: ImageData, theme: TransitionTheme) => {
  const corners = [
    pixelAt(image, 0, 0),
    pixelAt(image, image.width - 1, 0),
    pixelAt(image, 0, image.height - 1),
    pixelAt(image, image.width - 1, image.height - 1),
  ].filter((color) => color.a > 0.5);
  if (!corners.length) return fallbackBackground(theme);
  return {
    r: corners.reduce((sum, color) => sum + color.r, 0) / corners.length,
    g: corners.reduce((sum, color) => sum + color.g, 0) / corners.length,
    b: corners.reduce((sum, color) => sum + color.b, 0) / corners.length,
    a: corners.reduce((sum, color) => sum + color.a, 0) / corners.length,
  };
};

const mixPixelColor = (
  from: PixelColor,
  to: PixelColor,
  progress: number,
): PixelColor => ({
  r: from.r + (to.r - from.r) * progress,
  g: from.g + (to.g - from.g) * progress,
  b: from.b + (to.b - from.b) * progress,
  a: from.a + (to.a - from.a) * progress,
});

const cssColor = (color: PixelColor) =>
  `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;

const localGradient = (image: ImageData, x: number, y: number, radius: number) => {
  const center = pixelAt(image, x, y);
  return Math.max(
    colorDistance(center, pixelAt(image, x - radius, y)),
    colorDistance(center, pixelAt(image, x + radius, y)),
    colorDistance(center, pixelAt(image, x, y - radius)),
    colorDistance(center, pixelAt(image, x, y + radius)),
  );
};

const samplingSize = (
  width: number,
  height: number,
  device: TransitionDevice,
) => {
  const maxDimension = device === "mobile" ? 480 : 720;
  const scale = Math.min(1, maxDimension / Math.max(1, width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const sampleAtOutputPoint = (
  image: ImageData,
  point: TransitionPoint,
  width: number,
  height: number,
) =>
  pixelAt(
    image,
    (point.x / Math.max(1, width)) * image.width,
    (point.y / Math.max(1, height)) * image.height,
  );

const stratifiedLimit = (
  values: ParticleSample[],
  budget: number,
  width: number,
  height: number,
  device: TransitionDevice,
) => {
  if (values.length <= budget) return values;
  const columns = device === "mobile" ? 10 : 20;
  const rows = Math.max(
    device === "mobile" ? 16 : 8,
    Math.round(columns * (height / Math.max(1, width))),
  );
  const buckets = Array.from(
    { length: columns * rows },
    (): ParticleSample[] => [],
  );
  values.forEach((sample) => {
    const column = Math.min(
      columns - 1,
      Math.floor((sample.anchor.x / Math.max(1, width)) * columns),
    );
    const row = Math.min(
      rows - 1,
      Math.floor((sample.anchor.y / Math.max(1, height)) * rows),
    );
    buckets[row * columns + column]!.push(sample);
  });
  buckets.forEach((bucket) =>
    bucket.sort((left, right) => right.importance - left.importance),
  );

  const selected: ParticleSample[] = [];
  for (let depth = 0; selected.length < budget; depth += 1) {
    let found = false;
    for (const bucket of buckets) {
      const sample = bucket[depth];
      if (!sample) continue;
      selected.push(sample);
      found = true;
      if (selected.length >= budget) break;
    }
    if (!found) break;
  }
  return selected;
};

const collectSemanticSamples = (
  fromImage: ImageData,
  toImage: ImageData,
  width: number,
  height: number,
  budget: number,
  theme: TransitionTheme,
  device: TransitionDevice,
) => {
  const fromBackground = backgroundColor(fromImage, theme);
  const toBackground = backgroundColor(toImage, theme);
  const target = Math.max(1, Math.floor(budget * 0.58));
  const stride = Math.max(
    1,
    Math.floor(
      Math.sqrt(
        (fromImage.width * fromImage.height) / Math.max(1, target * 5),
      ),
    ),
  );
  const offset = Math.floor(stride / 2);
  const samples: ParticleSample[] = [];

  for (let y = offset; y < fromImage.height; y += stride) {
    for (let x = offset; x < fromImage.width; x += stride) {
      const fromColor = pixelAt(fromImage, x, y);
      const toColor = pixelAt(toImage, x, y);
      const radius = Math.max(1, stride);
      const salience = Math.max(
        colorDistance(fromColor, fromBackground) / 160,
        colorDistance(toColor, toBackground) / 160,
        localGradient(fromImage, x, y, radius) / 120,
        localGradient(toImage, x, y, radius) / 120,
        colorDistance(fromColor, toColor) / 190,
      );
      if (salience < 0.18) continue;
      samples.push({
        anchor: {
          x: (x / Math.max(1, fromImage.width - 1)) * width,
          y: (y / Math.max(1, fromImage.height - 1)) * height,
        },
        fromColor,
        toColor,
        importance: clampTransitionProgress(salience),
        guide: false,
      });
    }
  }

  return stratifiedLimit(samples, target, width, height, device);
};

const createGuideSamples = (
  fromImage: ImageData,
  toImage: ImageData,
  width: number,
  height: number,
  count: number,
  random: () => number,
) => {
  const aspect = width / Math.max(1, height);
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const samples: ParticleSample[] = [];
  for (let row = 0; row < rows && samples.length < count; row += 1) {
    for (let column = 0; column < columns && samples.length < count; column += 1) {
      const point = {
        x:
          ((column + 0.5 + (random() - 0.5) * 0.24) / columns) *
          width,
        y: ((row + 0.5 + (random() - 0.5) * 0.24) / rows) * height,
      };
      samples.push({
        anchor: point,
        fromColor: sampleAtOutputPoint(fromImage, point, width, height),
        toColor: sampleAtOutputPoint(toImage, point, width, height),
        importance: 0.24,
        guide: true,
      });
    }
  }
  return samples;
};

const frontierEnvelope = (progress: number) =>
  transitionPhase(progress, 0.06, 0.16) *
  (1 - transitionPhase(progress, 0.84, 0.94));

const frontierShape = (ratio: number) => {
  const centered = ratio - 0.5;
  return (
    Math.sin(centered * Math.PI * 1.3) * 0.86 -
    Math.sin(centered * Math.PI * 2.6) * 0.14
  );
};

const frontierX = (
  y: number,
  progress: number,
  width: number,
  height: number,
  amplitude: number,
  direction: -1 | 1,
) => {
  const travel = transitionPhase(progress, 0.06, 0.94);
  const center = direction > 0
    ? -width * 0.18 + width * 1.36 * travel
    : width * 1.18 - width * 1.36 * travel;
  return (
    center +
    frontierEnvelope(progress) *
      amplitude *
      frontierShape(y / Math.max(1, height))
  );
};

const clipToRebuiltSide = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  progress: number,
  width: number,
  height: number,
  amplitude: number,
  segments: number,
  direction: -1 | 1,
) => {
  const outside = direction > 0 ? -width : width * 2;
  ctx.beginPath();
  ctx.moveTo(outside, 0);
  ctx.lineTo(frontierX(0, progress, width, height, amplitude, direction), 0);
  for (let index = 1; index <= segments; index += 1) {
    const y = (index / segments) * height;
    ctx.lineTo(frontierX(y, progress, width, height, amplitude, direction), y);
  }
  ctx.lineTo(outside, height);
  ctx.closePath();
  ctx.clip();
};

const strokeReactionCore = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  progress: number,
  width: number,
  height: number,
  amplitude: number,
  segments: number,
  lineWidth: number,
  color: string,
  direction: -1 | 1,
) => {
  ctx.save();
  ctx.globalAlpha = frontierEnvelope(progress);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(frontierX(0, progress, width, height, amplitude, direction), 0);
  for (let index = 1; index <= segments; index += 1) {
    const y = (index / segments) * height;
    ctx.lineTo(frontierX(y, progress, width, height, amplitude, direction), y);
  }
  ctx.stroke();
  ctx.restore();
};

const frontierSlope = (
  y: number,
  progress: number,
  width: number,
  height: number,
  amplitude: number,
  direction: -1 | 1,
) => {
  const step = Math.max(1, height * 0.002);
  return (
    (frontierX(y + step, progress, width, height, amplitude, direction) -
      frontierX(y - step, progress, width, height, amplitude, direction)) /
    (step * 2)
  );
};

export const particlesAdapter: TransitionAdapter<ParticlesTransitionState> = {
  id: "particles",

  prepare(input) {
    const budget =
      input.device === "mobile"
        ? PARTICLE_BUDGET_MOBILE
        : PARTICLE_BUDGET_DESKTOP;
    const halfBand = input.device === "mobile" ? 32 : 44;
    const amplitude = input.device === "mobile"
      ? Math.min(input.width * 0.06, 38)
      : Math.min(input.width * 0.072, 84);
    const segments = input.device === "mobile" ? 28 : 48;
    const direction = input.motionPlan?.direction ?? 1;
    const sampleSize = samplingSize(input.width, input.height, input.device);
    const fromImage = readSnapshot(input.from, sampleSize.width, sampleSize.height);
    const toImage = readSnapshot(input.to, sampleSize.width, sampleSize.height);
    if (!fromImage || !toImage) {
      return Object.freeze({
        width: input.width,
        height: input.height,
        budget,
        halfBand,
        amplitude,
        segments,
        direction,
        particles: Object.freeze([]),
      });
    }

    const random = createTransitionPrng(input.seed, "particles/frontier-detail");
    const semantic = collectSemanticSamples(
      fromImage,
      toImage,
      input.width,
      input.height,
      budget,
      input.theme,
      input.device,
    );
    const guides = createGuideSamples(
      fromImage,
      toImage,
      input.width,
      input.height,
      Math.max(0, budget - semantic.length),
      random,
    );
    const muted: PixelColor =
      input.theme === "dark"
        ? { r: 143, g: 154, b: 167, a: 0.78 }
        : { r: 98, g: 98, b: 98, a: 0.72 };
    const accent: PixelColor =
      input.theme === "dark"
        ? { r: 184, g: 170, b: 223, a: 0.9 }
        : { r: 111, g: 95, b: 166, a: 0.88 };
    const particles = [...semantic, ...guides].map(
      (sample): PreparedParticle => {
        const accentParticle =
          !sample.guide && sample.importance > 0.46 && random() < 0.13;
        const sizeRoll = random();
        const size = sizeRoll < 0.7
          ? 1.8 + random() * 0.4
          : sizeRoll < 0.96
            ? 2.8 + random() * 0.8
            : 4.5;
        return Object.freeze({
          ...sample,
          fromColor: accentParticle
            ? accent
            : sample.guide
              ? muted
              : sample.fromColor,
          toColor: accentParticle
            ? accent
            : sample.guide
              ? muted
              : sample.toColor,
          size,
          normalKick: 3 + random() * 4,
          tangentCurl: 2 + random() * 4,
          phase: random() * Math.PI * 2,
          accent: accentParticle,
        });
      },
    );

    return Object.freeze({
      width: input.width,
      height: input.height,
      budget,
      halfBand,
      amplitude,
      segments,
      direction,
      particles: Object.freeze(particles),
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

    // Every pixel belongs to one canonical frame. The transition is a local
    // reaction seam, never two translucent pages or a full-screen dust cloud.
    drawTransitionSnapshot(ctx, input.from, width, height);
    const scaleX = width / Math.max(1, state.width);
    const scaleY = height / Math.max(1, state.height);
    const pointScale = Math.min(scaleX, scaleY);
    const amplitude = state.amplitude * scaleX;
    ctx.save();
    clipToRebuiltSide(
      ctx,
      progress,
      width,
      height,
      amplitude,
      state.segments,
      state.direction,
    );
    ctx.drawImage(input.to, 0, 0, width, height);
    ctx.restore();

    // A clean central core prevents titles from being cut directly against
    // one another. The particles then explain the change across that gap.
    strokeReactionCore(
      ctx,
      progress,
      width,
      height,
      amplitude,
      state.segments,
      state.halfBand * scaleX * 0.34,
      input.theme === "dark" ? "#111315" : "#ffffff",
      state.direction,
    );

    const halfBand = state.halfBand * scaleX;
    const reactionDensity =
      transitionPhase(progress, 0.06, 0.14) *
      (1 - transitionPhase(progress, 0.86, 0.94));

    for (const particle of state.particles) {
      const anchorX = particle.anchor.x * scaleX;
      const anchorY = particle.anchor.y * scaleY;
      const frontier = frontierX(
        anchorY,
        progress,
        width,
        height,
        amplitude,
        state.direction,
      );
      const distance = anchorX - frontier;
      if (Math.abs(distance) >= halfBand) continue;

      // q progresses from source side to rebuilt side as the same frontier
      // passes the anchor; this remains exactly reversible when scrolling up.
      const q = clampTransitionProgress(
        (halfBand - distance * state.direction) / Math.max(1, halfBand * 2),
      );
      const pulse = Math.pow(Math.sin(Math.PI * q), 0.72);
      if (pulse <= 0.002) continue;
      const slope = frontierSlope(
        anchorY,
        progress,
        width,
        height,
        amplitude,
        state.direction,
      );
      const inverseLength = 1 / Math.max(1, Math.hypot(1, slope));
      const normalX = inverseLength;
      const normalY = -slope * inverseLength;
      const tangentX = slope * inverseLength;
      const tangentY = inverseLength;
      const normalOffset =
        particle.normalKick *
        pointScale *
        pulse *
        (1 - q * 2);
      const tangentOffset =
        particle.tangentCurl *
        pointScale *
        pulse *
        Math.sin(Math.PI * 2 * q + particle.phase);
      const seamPull = -distance * pulse * 0.16;
      const x =
        anchorX +
        normalX * (normalOffset + seamPull) +
        tangentX * tangentOffset;
      const y =
        anchorY +
        normalY * (normalOffset + seamPull) +
        tangentY * tangentOffset;
      const color = mixPixelColor(particle.fromColor, particle.toColor, q);
      const endpointAlpha =
        particle.fromColor.a +
        (particle.toColor.a - particle.fromColor.a) * q;
      const alpha =
        endpointAlpha *
        pulse *
        reactionDensity *
        (particle.guide
          ? 0.78
          : particle.accent
            ? 0.96
            : 0.72 + particle.importance * 0.25);
      if (alpha <= 0.004) continue;

      const particleSize = particle.size * pointScale;
      ctx.globalAlpha = clampTransitionProgress(alpha);
      ctx.fillStyle = cssColor(color);
      ctx.fillRect(
        x - particleSize * 0.5,
        y - particleSize * 0.5,
        particleSize,
        particleSize,
      );
    }

    endTransitionFrame(ctx);
  },
};
