import type {
  HomeStoryTimelineSegment,
  HomeStoryTransitionMode,
} from "./timeline.ts";
import {
  isHomeStoryTransitionSegment,
} from "./timeline.ts";
import type { HomeMotionPlan } from "./homeMotionPlan.ts";
import type { HomeStorySceneDevice } from "./homeStoryTypes.ts";

export type HomeTransitionConfig = {
  mode: HomeStoryTransitionMode;
  edges: Partial<Record<string, HomeStoryTransitionMode>>;
  revision: number;
};

export type HomeTransitionRuntimeApi = {
  list: () => readonly HomeStoryTransitionMode[];
  getConfig: () => HomeTransitionConfig;
  setMode: (mode: HomeStoryTransitionMode) => HomeTransitionConfig;
  setEdge: (
    edge: string,
    mode: HomeStoryTransitionMode | null,
  ) => HomeTransitionConfig;
  edges: () => readonly string[];
  getPlan: (edge: string, device?: HomeStorySceneDevice) => HomeMotionPlan | null;
  reset: () => HomeTransitionConfig;
};

declare global {
  interface Window {
    homeTransitions?: HomeTransitionRuntimeApi;
  }
}

const MODES = Object.freeze([
  "auto",
  "blinds",
  "crossfade",
  "glyph-stream",
  "particles",
  "text-particles",
] as const);

const isMode = (value: unknown): value is HomeStoryTransitionMode =>
  typeof value === "string" && (MODES as readonly string[]).includes(value);

const copyConfig = (config: HomeTransitionConfig): HomeTransitionConfig => ({
  mode: config.mode,
  edges: { ...config.edges },
  revision: config.revision,
});

const initialMode = (): HomeStoryTransitionMode => {
  if (typeof window === "undefined") return "auto";
  const requested = new URLSearchParams(window.location.search).get("home-transition");
  return isMode(requested) ? requested : "auto";
};

export const installHomeTransitionRuntime = (
  timeline: readonly HomeStoryTimelineSegment[],
  onChange: (config: HomeTransitionConfig) => void,
) => {
  const transitionIds = Object.freeze(
    timeline
      .filter(isHomeStoryTransitionSegment)
      .map((segment) => segment.id),
  );
  const isEdge = (value: unknown): value is string =>
    typeof value === "string" && transitionIds.includes(value);
  const getMotionPlan = (
    edge: string,
    device: HomeStorySceneDevice = "desktop",
  ) => {
    const segment = timeline.find(
      (item) => isHomeStoryTransitionSegment(item) && item.id === edge,
    );
    return segment && isHomeStoryTransitionSegment(segment)
      ? segment.motionPlans[device]
      : null;
  };
  let config: HomeTransitionConfig = {
    mode: initialMode(),
    edges: {},
    revision: 0,
  };
  const transitionWindow = window;
  const previousApi = transitionWindow.homeTransitions;

  const publish = () => {
    config = { ...config, edges: { ...config.edges }, revision: config.revision + 1 };
    const snapshot = copyConfig(config);
    onChange(snapshot);
    window.dispatchEvent(new CustomEvent("home:transition-change", { detail: snapshot }));
    return snapshot;
  };

  const api: HomeTransitionRuntimeApi = {
    list: () => MODES,
    edges: () => transitionIds,
    getPlan: getMotionPlan,
    getConfig: () => copyConfig(config),
    setMode: (mode) => {
      if (!isMode(mode)) throw new TypeError(`Unknown home transition mode: ${String(mode)}`);
      if (config.mode === mode) return copyConfig(config);
      config.mode = mode;
      return publish();
    },
    setEdge: (edge, mode) => {
      if (!isEdge(edge)) throw new TypeError(`Unknown home transition edge: ${String(edge)}`);
      if (mode !== null && !isMode(mode)) {
        throw new TypeError(`Unknown home transition mode: ${String(mode)}`);
      }
      if (mode === null) delete config.edges[edge];
      else config.edges[edge] = mode;
      return publish();
    },
    reset: () => {
      config = { mode: "auto", edges: {}, revision: config.revision };
      return publish();
    },
  };

  transitionWindow.homeTransitions = api;

  return {
    api,
    getConfig: api.getConfig,
    dispose: () => {
      if (transitionWindow.homeTransitions !== api) return;
      if (previousApi) transitionWindow.homeTransitions = previousApi;
      else delete transitionWindow.homeTransitions;
    },
  };
};
