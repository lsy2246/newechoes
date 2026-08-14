import {
  beginTransitionFrame,
  clampTransitionProgress,
  createTransitionPrng,
  drawTransitionSnapshot,
  endTransitionFrame,
  transitionPhase,
  type TransitionAdapter,
  type TransitionGlyphRun,
  type TransitionPoint,
  type TransitionSnapshot,
} from "../types.ts";

// Preparation budgets describe semantic reaction regions. The adapter never
// renders their text; it only uses the regions to reorganize pixels already
// present in the canonical snapshots.
export const GLYPH_BUDGET_DESKTOP = 18;
export const GLYPH_BUDGET_MOBILE = 10;

type PreparedRegion = Readonly<{
  from: TransitionPoint;
  to: TransitionPoint;
  delay: number;
}>;

export type GlyphStreamTransitionState = Readonly<{
  width: number;
  height: number;
  device: "desktop" | "mobile";
  regions: readonly PreparedRegion[];
}>;

const normalizeRuns = (
  glyphs: Parameters<TransitionAdapter<GlyphStreamTransitionState>["prepare"]>[0]["glyphs"],
): TransitionGlyphRun[] => {
  if (!glyphs) return [];
  if (typeof glyphs === "string") return [{ text: glyphs }];
  return glyphs.map((entry) =>
    typeof entry === "string" ? { text: entry } : entry,
  );
};

const splitRuns = (runs: readonly TransitionGlyphRun[]) =>
  runs.flatMap((run) => {
    if (run.fromText || run.toText) return [run];
    const parts = run.text.match(/[\p{L}\p{N}_./:-]+|[^\s]/gu) ?? [];
    return parts.map((text) => ({ ...run, text }));
  });

const drawClippedSnapshot = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  snapshot: TransitionSnapshot,
  width: number,
  height: number,
  x: number,
  clipWidth: number,
) => {
  if (clipWidth <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, 0, clipWidth, height);
  ctx.clip();
  ctx.drawImage(snapshot, 0, 0, width, height);
  ctx.restore();
};

const drawReactionSlice = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  snapshot: TransitionSnapshot,
  width: number,
  height: number,
  x: number,
  y: number,
  sliceWidth: number,
  sliceHeight: number,
  offsetX: number,
  alpha: number,
) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, sliceWidth, sliceHeight);
  ctx.clip();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(snapshot, offsetX, 0, width, height);
  ctx.restore();
};

export const glyphStreamAdapter: TransitionAdapter<GlyphStreamTransitionState> = {
  id: "glyph-stream",

  prepare(input) {
    const budget = input.device === "mobile"
      ? GLYPH_BUDGET_MOBILE
      : GLYPH_BUDGET_DESKTOP;
    const random = createTransitionPrng(input.seed, "glyph-stream/reaction-order");
    const runs = splitRuns(normalizeRuns(input.glyphs)).slice(0, budget);
    const fallbackTracks = input.device === "mobile"
      ? [input.height * 0.38, input.height * 0.55, input.height * 0.72]
      : [input.height * 0.43, input.height * 0.5, input.height * 0.57];
    const regions = runs.map((run, index): PreparedRegion => {
      const track = fallbackTracks[index % fallbackTracks.length] ?? input.height * 0.5;
      return Object.freeze({
        from: run.from ?? { x: input.width * 0.2, y: track },
        to: run.to ?? { x: input.width * 0.8, y: track },
        delay: random() * 0.008,
      });
    });

    return Object.freeze({
      width: input.width,
      height: input.height,
      device: input.device,
      regions: Object.freeze(regions),
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

    // One canonical frame exists on either side of the compiler seam. The
    // reaction band below only rearranges those existing pixels; it never
    // introduces an extra word, label or glyph layer.
    const compile = transitionPhase(progress, 0.22, 0.86);
    const splitX = width * compile;
    const seam = Math.max(4, width * 0.004);
    ctx.fillStyle = input.theme === "dark" ? "#111315" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    drawClippedSnapshot(
      ctx,
      input.to,
      width,
      height,
      0,
      Math.max(0, splitX - seam * 0.5),
    );
    drawClippedSnapshot(
      ctx,
      input.from,
      width,
      height,
      Math.min(width, splitX + seam * 0.5),
      Math.max(0, width - splitX - seam * 0.5),
    );

    const scaleX = width / Math.max(1, state.width);
    const scaleY = height / Math.max(1, state.height);
    const pointScale = Math.min(scaleX, scaleY);
    const rowCount = state.device === "mobile" ? 5 : 7;
    const reactionHalfWidth = Math.max(
      state.device === "mobile" ? 22 : 32,
      width * (state.device === "mobile" ? 0.028 : 0.022),
    );

    for (const region of state.regions) {
      const anchorProgress = clampTransitionProgress(
        region.from.x / Math.max(1, state.width),
      );
      const local = transitionPhase(
        compile,
        Math.max(0, anchorProgress - 0.025 + region.delay),
        Math.min(1, anchorProgress + 0.16 + region.delay),
      );
      const activity = Math.pow(Math.sin(Math.PI * local), 0.75);
      if (activity <= 0.003) continue;

      const fromY = region.from.y * scaleY;
      const toY = region.to.y * scaleY;
      const centerY = fromY + (toY - fromY) * local;
      const sliceHeight = Math.max(2, pointScale * 2.2);
      const rowGap = sliceHeight * 1.55;
      const sliceWidth = reactionHalfWidth * 2;
      const sliceX = splitX - reactionHalfWidth;

      for (let row = 0; row < rowCount; row += 1) {
        const rowRatio = rowCount <= 1 ? 0.5 : row / (rowCount - 1);
        const y = centerY + (row - (rowCount - 1) * 0.5) * rowGap;
        const useTarget = rowRatio <= local;
        const direction = row % 2 === 0 ? -1 : 1;
        const offsetX = direction * activity * (2 + (row % 3) * 1.5) * pointScale;
        drawReactionSlice(
          ctx,
          useTarget ? input.to : input.from,
          width,
          height,
          sliceX,
          y,
          sliceWidth,
          sliceHeight,
          offsetX,
          0.72 + activity * 0.2,
        );
      }

      ctx.save();
      ctx.globalAlpha = activity * 0.58;
      ctx.fillStyle = input.theme === "dark" ? "#b8aadf" : "#6f5fa6";
      const marker = Math.max(1.5, pointScale * 1.8);
      ctx.fillRect(splitX - marker * 0.5, centerY - marker * 0.5, marker, marker);
      ctx.restore();
    }

    const cursorVisibility =
      transitionPhase(progress, 0.18, 0.26) *
      (1 - transitionPhase(progress, 0.86, 0.94));
    if (cursorVisibility > 0.002) {
      ctx.save();
      ctx.globalAlpha = cursorVisibility * 0.34;
      ctx.fillStyle = input.theme === "dark" ? "#b8aadf" : "#6f5fa6";
      ctx.fillRect(
        splitX - Math.max(0.5, pointScale * 0.5),
        height * 0.24,
        Math.max(1, pointScale),
        height * 0.52,
      );
      ctx.restore();
    }

    endTransitionFrame(ctx);
  },
};
