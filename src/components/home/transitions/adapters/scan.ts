import {
  beginTransitionFrame,
  clampTransitionProgress,
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

const SCAN_START = 0.06;
const SCAN_END = 0.94;
const SCAN_LINE_WIDTH_DESKTOP = 1.4;
const SCAN_LINE_WIDTH_MOBILE = 1.1;

export type ScanTransitionState = Readonly<{
  width: number;
  height: number;
  direction: -1 | 1;
  band: number;
  lineTop: number;
  lineBottom: number;
}>;

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

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

const drawSnapshotSlice = (
  ctx: TransitionContext2D,
  snapshot: TransitionSnapshot,
  width: number,
  height: number,
  x: number,
  sliceWidth: number,
) => {
  const left = Math.max(0, x);
  const right = Math.min(width, x + sliceWidth);
  if (right <= left) return;
  const sourceLeft = (left / Math.max(1, width)) * snapshot.width;
  const sourceWidth = ((right - left) / Math.max(1, width)) * snapshot.width;
  ctx.drawImage(snapshot, sourceLeft, 0, sourceWidth, snapshot.height, left, 0, right - left, height);
};

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
  const sourceLeft = (left / Math.max(1, width)) * snapshot.width;
  const sourceWidth = ((right - left) / Math.max(1, width)) * snapshot.width;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(snapshot, sourceLeft, 0, sourceWidth, snapshot.height, left, 0, right - left, height);
  ctx.restore();
};

const drawScanLine = (
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
  const enter = transitionPhase(progress, SCAN_START, 0.12);
  const exit = 1 - transitionPhase(progress, 0.88, SCAN_END);
  const visibility = Math.min(enter, exit);
  if (visibility <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = visibility * (theme === "dark" ? 0.82 : 0.68);
  ctx.strokeStyle = theme === "dark" ? "#b8aadf" : "#6f5fa6";
  ctx.lineWidth = Math.max(
    1,
    (device === "mobile" ? SCAN_LINE_WIDTH_MOBILE : SCAN_LINE_WIDTH_DESKTOP) * pointScale,
  );
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(frontier, lineTop);
  ctx.lineTo(frontier, lineBottom);
  ctx.stroke();
  ctx.restore();
};

export const scanAdapter: TransitionAdapter<ScanTransitionState> = {
  id: "scan",

  prepare(input) {
    const operations = input.motionPlan?.operations.filter(
      (operation) => operation.from || operation.to,
    ) ?? [];
    return Object.freeze({
      width: input.width,
      height: input.height,
      direction: input.motionPlan?.direction ?? 1,
      band: input.device === "mobile" ? 38 : 58,
      ...scanLineRange(operations, input.height, input.device),
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

    const scaleY = height / Math.max(1, state.height);
    const pointScale = Math.min(width / Math.max(1, state.width), scaleY);
    const band = state.band * pointScale;
    const scan = transitionPhase(progress, SCAN_START, SCAN_END);
    const frontier = state.direction > 0
      ? mix(-band, width + band, scan)
      : mix(width + band, -band, scan);

    ctx.fillStyle = input.theme === "dark" ? "#111315" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const rebuiltEdge = state.direction > 0 ? frontier - band : frontier + band;
    const sourceEdge = state.direction > 0 ? frontier + band : frontier - band;

    if (state.direction > 0) {
      drawSnapshotSlice(ctx, input.to, width, height, 0, rebuiltEdge);
      const sourceX = Math.max(0, Math.min(width, sourceEdge));
      drawSnapshotSlice(ctx, input.from, width, height, sourceX, width - sourceX);
    } else {
      const targetX = Math.max(0, Math.min(width, rebuiltEdge));
      drawSnapshotSlice(ctx, input.to, width, height, targetX, width - targetX);
      drawSnapshotSlice(ctx, input.from, width, height, 0, sourceEdge);
    }

    const featherSteps = 2;
    const stripWidth = band / featherSteps;
    for (let step = 0; step < featherSteps; step += 1) {
      const lowToHigh = (step + 0.5) / featherSteps;
      if (state.direction > 0) {
        drawFeatherStrip(ctx, input.to, width, height, frontier - band + step * stripWidth, stripWidth, 1 - lowToHigh);
        drawFeatherStrip(ctx, input.from, width, height, frontier + step * stripWidth, stripWidth, lowToHigh);
      } else {
        drawFeatherStrip(ctx, input.from, width, height, frontier - band + step * stripWidth, stripWidth, 1 - lowToHigh);
        drawFeatherStrip(ctx, input.to, width, height, frontier + step * stripWidth, stripWidth, lowToHigh);
      }
    }

    drawScanLine(
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
