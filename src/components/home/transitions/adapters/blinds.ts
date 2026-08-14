import {
  beginTransitionFrame,
  clampTransitionProgress,
  createTransitionPrng,
  drawTransitionSnapshot,
  endTransitionFrame,
  smoothTransitionProgress,
  type TransitionAdapter,
} from "../types.ts";

type BlindOrientation = "horizontal" | "vertical";
type BlindOrigin = "start" | "center" | "end";

export type BlindsTransitionState = Readonly<{
  orientation: BlindOrientation;
  stripCount: number;
  delays: readonly number[];
  origins: readonly BlindOrigin[];
}>;

const MAX_STAGGER = 0.16;

export const blindsAdapter: TransitionAdapter<BlindsTransitionState> = {
  id: "blinds",

  prepare(input) {
    const random = createTransitionPrng(input.seed, "blinds");
    const plan = input.motionPlan;
    const orientation: BlindOrientation =
      plan ? (plan.axis === "x" ? "vertical" : "horizontal") :
        random() < 0.5 ? "horizontal" : "vertical";
    const stripCount = input.device === "mobile" ? 12 : 20;
    const reverseWave = plan ? plan.direction < 0 : random() < 0.5;
    const centerOpen = plan
      ? plan.metrics.topologyChange < 0.08 && plan.metrics.layoutShift < 0.05
      : random() < 0.42;
    const alternatingOffset = random() < 0.5 ? 0 : 1;
    const delays: number[] = [];
    const origins: BlindOrigin[] = [];

    for (let index = 0; index < stripCount; index += 1) {
      const orderedIndex = reverseWave ? stripCount - index - 1 : index;
      const position = stripCount <= 1 ? 0 : orderedIndex / (stripCount - 1);
      const jitter = (random() - 0.5) * 0.018;
      delays.push(clampTransitionProgress(position * MAX_STAGGER + jitter));
      origins.push(
        centerOpen
          ? "center"
          : (index + alternatingOffset) % 2 === 0
            ? "start"
            : "end",
      );
    }

    return Object.freeze({
      orientation,
      stripCount,
      delays: Object.freeze(delays),
      origins: Object.freeze(origins),
    });
  },

  render(input) {
    const { ctx, state, width, height } = input;
    const progress = smoothTransitionProgress(input.progress);
    beginTransitionFrame(ctx, width, height);
    drawTransitionSnapshot(ctx, input.from, width, height);

    for (let index = 0; index < state.stripCount; index += 1) {
      const delay = state.delays[index] ?? 0;
      const localProgress = smoothTransitionProgress(
        (progress - delay) / Math.max(0.000_001, 1 - delay),
      );
      if (localProgress <= 0) continue;

      const origin = state.origins[index] ?? "center";
      ctx.save();
      ctx.beginPath();

      if (state.orientation === "vertical") {
        const start = Math.floor((index * width) / state.stripCount);
        const end =
          index === state.stripCount - 1
            ? width
            : Math.ceil(((index + 1) * width) / state.stripCount);
        const stripSize = end - start;
        const revealed = stripSize * localProgress;
        const offset =
          origin === "center"
            ? (stripSize - revealed) * 0.5
            : origin === "end"
              ? stripSize - revealed
              : 0;
        ctx.rect(start + offset, 0, Math.max(0.5, revealed), height);
      } else {
        const start = Math.floor((index * height) / state.stripCount);
        const end =
          index === state.stripCount - 1
            ? height
            : Math.ceil(((index + 1) * height) / state.stripCount);
        const stripSize = end - start;
        const revealed = stripSize * localProgress;
        const offset =
          origin === "center"
            ? (stripSize - revealed) * 0.5
            : origin === "end"
              ? stripSize - revealed
              : 0;
        ctx.rect(0, start + offset, width, Math.max(0.5, revealed));
      }

      ctx.clip();
      ctx.drawImage(input.to, 0, 0, width, height);
      ctx.restore();
    }

    endTransitionFrame(ctx);
  },
};
