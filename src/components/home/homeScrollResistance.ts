import { HOME_MOTION_TIMING } from "./homeMotionTiming.ts";

export type HomeScrollInputDevice = "desktop" | "mobile";

export type HomeScrollResistanceInput = {
  deltaPx: number;
  elapsedMs: number;
  progress: number;
  viewportHeight: number;
  device: HomeScrollInputDevice;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const normalizeWheelDelta = (delta: number, deltaMode: number, viewportHeight: number) => {
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * Math.max(1, viewportHeight);
  return delta;
};

/**
 * A stateless speed ceiling. Every event is governed by the same pixels-per-
 * second limit, so a gesture cannot start fast and then stall after spending a
 * hidden burst allowance. Excess input is discarded rather than queued.
 */
export const getPacedHomeScrollDelta = ({
  deltaPx,
  elapsedMs,
  viewportHeight,
  device,
  speedMultiplier = 1,
}: Pick<HomeScrollResistanceInput, "deltaPx" | "elapsedMs" | "viewportHeight" | "device"> & {
  speedMultiplier?: number;
}) => {
  if (!Number.isFinite(deltaPx) || Math.abs(deltaPx) < 0.001) return 0;

  const height = Math.max(1, viewportHeight);
  const timing = HOME_MOTION_TIMING.scroll[device];
  const elapsed = clamp(
    elapsedMs,
    HOME_MOTION_TIMING.scroll.minEventMs,
    HOME_MOTION_TIMING.scroll.maxEventMs,
  );
  const maxDistance =
    height * timing.maxViewportPerSecond * Math.max(0, speedMultiplier) * (elapsed / 1_000);
  return Math.sign(deltaPx) * Math.min(Math.abs(deltaPx), maxDistance);
};

export const getResistedHomeScrollDelta = ({
  deltaPx,
  viewportHeight,
  device,
}: HomeScrollResistanceInput) => {
  if (!Number.isFinite(deltaPx) || Math.abs(deltaPx) < 0.001) return 0;

  const height = Math.max(1, viewportHeight);
  const magnitude = Math.abs(deltaPx);
  const fineThreshold = Math.max(
    device === "mobile" ? 14 : 18,
    height * (device === "mobile" ? 0.018 : 0.022),
  );
  const excess = Math.max(0, magnitude - fineThreshold);
  const compressed = magnitude <= fineThreshold
    ? magnitude
    : fineThreshold + Math.sqrt(excess * fineThreshold);
  const maxStep = height * (device === "mobile" ? 0.085 : 0.1375);
  const effectiveMagnitude = Math.min(compressed, maxStep);

  return Math.sign(deltaPx) * effectiveMagnitude;
};
