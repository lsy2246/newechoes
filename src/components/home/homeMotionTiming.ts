export type HomeScrollPaceDeviceTiming = Readonly<{
  /** Universal high-speed ceiling, measured in viewports per second. */
  maxViewportPerSecond: number;
}>;

/**
 * Homepage motion rhythm in one place.
 *
 * Distances are expressed as a fraction of the viewport so the same authored
 * beat remains readable on a laptop, a large display, and mobile. Slow,
 * precision input is still rendered 1:1; these values only govern fast input.
 */
export const HOME_MOTION_TIMING = Object.freeze({
  scroll: Object.freeze({
    minEventMs: 8,
    maxEventMs: 120,
    classifyTo3dBoost: 1.35,
    classifyEntryFeather: 0.02,
    desktop: Object.freeze({
      maxViewportPerSecond: 2.8,
    }),
    mobile: Object.freeze({
      maxViewportPerSecond: 1.8,
    }),
  }),
  workToday: Object.freeze({
    holdBeforeViewport: 0.98,
    holdAfterViewport: 0.02,
  }),
});
