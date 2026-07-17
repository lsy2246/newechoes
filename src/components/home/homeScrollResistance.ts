export type HomeScrollInputDevice = "desktop" | "mobile";

export type HomeScrollResistanceInput = {
  deltaPx: number;
  elapsedMs: number;
  progress: number;
  viewportHeight: number;
  device: HomeScrollInputDevice;
};

type ResistanceZone = {
  start: number;
  end: number;
  multiplier: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const smoothstep = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export const HOME_SCROLL_RESISTANCE_ZONES: readonly ResistanceZone[] = [
  { start: 0.04, end: 0.16, multiplier: 1.35 },
  { start: 0.22, end: 0.41, multiplier: 1.45 },
  { start: 0.40, end: 0.53, multiplier: 1.50 },
  { start: 0.56, end: 0.70, multiplier: 1.60 },
  { start: 0.70, end: 0.86, multiplier: 1.55 },
  { start: 0.86, end: 0.925, multiplier: 2.40 },
  { start: 0.925, end: 0.95, multiplier: 1.80 },
  { start: 0.95, end: 1, multiplier: 2.00 },
];

export const HOME_SCROLL_FAST_INPUT_SCALE = 1.25;

export const normalizeWheelDelta = (delta: number, deltaMode: number, viewportHeight: number) => {
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * Math.max(1, viewportHeight);
  return delta;
};

export const getHomeScrollZoneResistance = (progress: number) => {
  const value = clamp(progress);
  return HOME_SCROLL_RESISTANCE_ZONES.reduce((strongest, zone) => {
    const feather = Math.min(0.016, (zone.end - zone.start) / 3);
    const enter = smoothstep((value - (zone.start - feather)) / feather);
    const exit = 1 - smoothstep((value - zone.end) / feather);
    const weight = Math.min(enter, exit);
    return Math.max(strongest, 1 + (zone.multiplier - 1) * weight);
  }, 1);
};

export const getResistedHomeScrollDelta = ({
  deltaPx,
  elapsedMs,
  progress,
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
  const elapsed = clamp(elapsedMs, 8, 120);
  const velocity = magnitude / elapsed;
  const velocityStart = device === "mobile" ? 0.9 : 0.65;
  const velocitySpan = device === "mobile" ? 3.2 : 2.4;
  const velocityAmount = smoothstep((velocity - velocityStart) / velocitySpan);
  const magnitudeAmount = smoothstep((magnitude - fineThreshold) / (fineThreshold * 2.5));
  const resistanceAmount = Math.max(velocityAmount, magnitudeAmount);
  const velocityResistance = 1 + velocityAmount * (device === "mobile" ? 0.5 : 0.65);
  const zoneResistance = getHomeScrollZoneResistance(progress);
  const effectiveResistance = lerp(1, velocityResistance * zoneResistance, resistanceAmount);
  const inputSpeedScale = lerp(1, HOME_SCROLL_FAST_INPUT_SCALE, resistanceAmount);
  const maxStep = height * (device === "mobile" ? 0.10625 : 0.1375);
  const effectiveMagnitude = Math.min(
    (compressed / effectiveResistance) * inputSpeedScale,
    maxStep,
  );

  return Math.sign(deltaPx) * effectiveMagnitude;
};
