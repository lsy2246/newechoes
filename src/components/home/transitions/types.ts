export const TRANSITION_KINDS = [
  "crossfade",
  "blinds",
  "glyph-stream",
  "particles",
  "text-particles",
] as const;

export type TransitionKind = (typeof TRANSITION_KINDS)[number];
export type TransitionDevice = "desktop" | "mobile";
export type TransitionTheme = "light" | "dark";
export type TransitionSeed = string | number;
export type TransitionSnapshot = HTMLCanvasElement | OffscreenCanvas;
export type TransitionContext2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export type TransitionPoint = Readonly<{
  x: number;
  y: number;
}>;

/**
 * A semantic text run. Coordinates are baselines in transition-canvas pixels.
 * When omitted, the glyph-stream adapter lays the run out on deterministic
 * reading lanes instead of inventing placeholder characters.
 */
export type TransitionGlyphRun = Readonly<{
  text: string;
  /** Optional source/target pair for an in-place semantic rewrite. */
  fromText?: string;
  toText?: string;
  from?: TransitionPoint;
  to?: TransitionPoint;
  color?: string;
  font?: string;
  size?: number;
  weight?: number | string;
}>;

export type TransitionGlyphs =
  | string
  | readonly (string | TransitionGlyphRun)[];

export type TransitionInput = Readonly<{
  from: TransitionSnapshot;
  to: TransitionSnapshot;
  ctx: TransitionContext2D;
  width: number;
  height: number;
  device: TransitionDevice;
  theme: TransitionTheme;
  seed: TransitionSeed;
  glyphs?: TransitionGlyphs;
  /** Element-level plan derived from the adjacent declarative scenes. */
  motionPlan?: HomeMotionPlan;
}>;

export type TransitionPrepareInput = TransitionInput;

export type TransitionRenderInput<State> = TransitionInput &
  Readonly<{
    state: State;
    progress: number;
  }>;

export interface TransitionAdapter<State = unknown> {
  readonly id: TransitionKind;
  prepare(input: TransitionPrepareInput): State;
  render(input: TransitionRenderInput<State>): void;
}

export const clampTransitionProgress = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export const smoothTransitionProgress = (value: number) => {
  const progress = clampTransitionProgress(value);
  return progress * progress * (3 - 2 * progress);
};

export const transitionPhase = (
  value: number,
  start: number,
  end: number,
) => {
  const span = Math.max(0.000_001, end - start);
  return smoothTransitionProgress((value - start) / span);
};

/** FNV-1a plus an avalanche step, normalized to a non-zero uint32. */
export const hashTransitionSeed = (
  seed: TransitionSeed,
  namespace = "",
) => {
  const value = `${namespace}\u0000${String(seed)}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) || 0x6d2b79f5;
};

/**
 * Mulberry32 seeded through hashTransitionSeed. Calling this function is the
 * only source of pseudo-random values used by the transition adapters.
 */
export const createTransitionPrng = (
  seed: TransitionSeed,
  namespace = "",
) => {
  let state = hashTransitionSeed(seed, namespace);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const drawTransitionSnapshot = (
  ctx: TransitionContext2D,
  snapshot: TransitionSnapshot,
  width: number,
  height: number,
  alpha = 1,
) => {
  const visibleAlpha = clampTransitionProgress(alpha);
  if (visibleAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= visibleAlpha;
  ctx.drawImage(snapshot, 0, 0, width, height);
  ctx.restore();
};

export const beginTransitionFrame = (
  ctx: TransitionContext2D,
  width: number,
  height: number,
) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, width, height);
};

export const endTransitionFrame = (ctx: TransitionContext2D) => {
  ctx.restore();
};
import type { HomeMotionPlan } from "../homeMotionPlan.ts";
