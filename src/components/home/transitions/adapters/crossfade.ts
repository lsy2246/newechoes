import {
  beginTransitionFrame,
  drawTransitionSnapshot,
  endTransitionFrame,
  hashTransitionSeed,
  smoothTransitionProgress,
  type TransitionAdapter,
} from "../types.ts";

export type CrossfadeTransitionState = Readonly<{
  width: number;
  height: number;
  seed: number;
}>;

export const crossfadeAdapter: TransitionAdapter<CrossfadeTransitionState> = {
  id: "crossfade",

  prepare(input) {
    return Object.freeze({
      width: input.width,
      height: input.height,
      seed: hashTransitionSeed(input.seed, "crossfade"),
    });
  },

  render(input) {
    const progress = smoothTransitionProgress(input.progress);
    beginTransitionFrame(input.ctx, input.width, input.height);
    drawTransitionSnapshot(
      input.ctx,
      input.from,
      input.width,
      input.height,
      1 - progress,
    );
    drawTransitionSnapshot(
      input.ctx,
      input.to,
      input.width,
      input.height,
      progress,
    );
    endTransitionFrame(input.ctx);
  },
};
