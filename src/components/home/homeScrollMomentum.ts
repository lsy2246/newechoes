import type { HomeScrollInputDevice } from "./homeScrollResistance.ts";

export type HomeScrollMomentumState = Readonly<{
  positionPx: number;
  targetPx: number;
  velocityPxPerSecond: number;
}>;

export type HomeScrollMomentumFrame = HomeScrollMomentumState & Readonly<{
  settled: boolean;
}>;

const DEVICE_MOMENTUM = Object.freeze({
  desktop: Object.freeze({
    angularFrequency: 13.5,
    settlePositionPx: 0.35,
    settleVelocityPxPerSecond: 3,
    maxTargetViewportLead: 0.5,
  }),
  mobile: Object.freeze({
    angularFrequency: 13.2,
    settlePositionPx: 0.35,
    settleVelocityPxPerSecond: 3,
    maxTargetViewportLead: 0.44,
  }),
});

const MOBILE_RELEASE_MIN_VELOCITY = 120;
const MOBILE_RELEASE_PROJECTION_SECONDS = 0.1;
const MOBILE_RELEASE_MAX_VIEWPORT_LEAD = 0.18;

/**
 * Advances a critically damped scroll spring. A wheel burst moves the target,
 * then the rendered page accelerates toward it and decelerates without
 * overshooting after hardware input has stopped.
 */
export const stepHomeScrollMomentum = (
  state: HomeScrollMomentumState,
  elapsedMs: number,
  device: HomeScrollInputDevice,
): HomeScrollMomentumFrame => {
  const timing = DEVICE_MOMENTUM[device];
  const dt = Math.min(64, Math.max(0, elapsedMs)) / 1_000;
  const omega = timing.angularFrequency;
  const displacement = state.positionPx - state.targetPx;
  const springTerm = state.velocityPxPerSecond + omega * displacement;
  const decay = Math.exp(-omega * dt);
  const nextDisplacement = (displacement + springTerm * dt) * decay;
  const nextVelocity = (
    state.velocityPxPerSecond - omega * springTerm * dt
  ) * decay;
  const nextPosition = state.targetPx + nextDisplacement;
  const settled =
    Math.abs(state.targetPx - nextPosition) <= timing.settlePositionPx &&
    Math.abs(nextVelocity) <= timing.settleVelocityPxPerSecond;

  return settled
    ? {
        positionPx: state.targetPx,
        targetPx: state.targetPx,
        velocityPxPerSecond: 0,
        settled: true,
      }
    : {
        positionPx: nextPosition,
        targetPx: state.targetPx,
        velocityPxPerSecond: nextVelocity,
        settled: false,
      };
};

export const getHomeScrollMomentumLeadLimit = (
  viewportHeight: number,
  device: HomeScrollInputDevice,
) => Math.max(1, viewportHeight) * DEVICE_MOMENTUM[device].maxTargetViewportLead;

/** Projects a short, bounded continuation from the final touch velocity. */
export const getHomeTouchReleaseLead = (
  velocityPxPerSecond: number,
  viewportHeight: number,
) => {
  if (!Number.isFinite(velocityPxPerSecond)) return 0;
  if (Math.abs(velocityPxPerSecond) < MOBILE_RELEASE_MIN_VELOCITY) return 0;
  const maxLead = Math.max(1, viewportHeight) * MOBILE_RELEASE_MAX_VIEWPORT_LEAD;
  const projected = velocityPxPerSecond * MOBILE_RELEASE_PROJECTION_SECONDS;
  return Math.min(maxLead, Math.max(-maxLead, projected));
};

/** Returns the closest chapter stop in the requested direction. */
export const getAdjacentHomeChapterStop = (
  progress: number,
  direction: -1 | 1,
  stops: readonly number[],
) => {
  const normalized = Math.min(1, Math.max(0, progress));
  const epsilon = 0.002;
  if (direction > 0) {
    return stops.find((stop) => stop > normalized + epsilon) ?? 1;
  }
  return [...stops].reverse().find((stop) => stop < normalized - epsilon) ?? 0;
};
