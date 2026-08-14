import {
  createHomeMotionPlan,
  motionPlanGlyphs,
  type HomeMotionPlan,
} from "./homeMotionPlan.ts";
import {
  homeStoryScenes,
  type HomeStoryScene,
} from "./homeStoryScenes.ts";

export type HomeStoryChapter = HomeStoryScene;

export type HomeStoryTransitionMode =
  | "auto"
  | "blinds"
  | "crossfade"
  | "glyph-stream"
  | "particles"
  | "text-particles";

export type HomeStoryEdge = {
  id: string;
  from: string;
  to: string;
  mode: HomeStoryTransitionMode;
};

type HomeStoryCanonicalSegment = {
  id: string;
  kind: "canonical";
  start: number;
  end: number;
  scene: HomeStoryScene;
};

export type HomeStoryTransitionSegment = {
  id: string;
  kind: "transition";
  start: number;
  end: number;
  fromProgress: number;
  toProgress: number;
  edge: HomeStoryEdge;
  from: HomeStoryChapter;
  to: HomeStoryChapter;
  motionPlans: Readonly<{
    desktop: HomeMotionPlan;
    mobile: HomeMotionPlan;
  }>;
  glyphs: readonly string[];
};

export type HomeStoryTimelineSegment = HomeStoryCanonicalSegment | HomeStoryTransitionSegment;

const normalizeWeight = (value: number) =>
  Math.max(0, Number.isFinite(value) ? value : 0);

/**
 * Build the complete story timeline from ordered scene declarations. Scene
 * adjacency, edge IDs, snapshot anchors and element-level motion plans are all
 * derived here, so adding or reordering a chapter does not require editing a
 * second hard-coded timeline.
 */
export const createHomeStoryTimeline = (
  scenes: readonly HomeStoryScene[] = homeStoryScenes,
): readonly HomeStoryTimelineSegment[] => {
  if (scenes.length === 0) {
    throw new Error("The home story needs at least one scene");
  }

  const totalWeight = scenes.reduce(
    (sum, scene, index) =>
      sum + normalizeWeight(scene.canonicalWeight) +
      (index < scenes.length - 1 ? normalizeWeight(scene.transitionWeight) : 0),
    0,
  );
  if (totalWeight <= 0) {
    throw new Error("The home story timeline needs a positive duration");
  }

  const timeline: HomeStoryTimelineSegment[] = [];
  let cursor = 0;

  scenes.forEach((scene, index) => {
    const canonicalStart = cursor;
    cursor += normalizeWeight(scene.canonicalWeight) / totalWeight;
    timeline.push({
      id: scene.id,
      kind: "canonical",
      start: canonicalStart,
      end: cursor,
      scene,
    });

    const next = scenes[index + 1];
    if (!next) return;
    const transitionWeight = normalizeWeight(scene.transitionWeight);
    if (transitionWeight <= 0) return;

    const desktop = createHomeMotionPlan(scene, next, "desktop");
    const mobile = createHomeMotionPlan(scene, next, "mobile");
    const start = cursor;
    cursor += transitionWeight / totalWeight;
    const text = motionPlanGlyphs(desktop)
      .map((glyph) => glyph.text)
      .filter((value, glyphIndex, all) => all.indexOf(value) === glyphIndex);

    timeline.push({
      id: desktop.id,
      kind: "transition",
      start,
      end: cursor,
      fromProgress: scene.snapshotProgress,
      toProgress: next.snapshotProgress,
      edge: {
        id: `${scene.id}->${next.id}`,
        from: scene.id,
        to: next.id,
        mode: "auto",
      },
      from: scene,
      to: next,
      motionPlans: Object.freeze({ desktop, mobile }),
      glyphs: Object.freeze(text),
    });
  });

  // Remove floating point drift while keeping every internal boundary shared.
  const last = timeline[timeline.length - 1]!;
  if (last.end !== 1) {
    timeline[timeline.length - 1] = { ...last, end: 1 };
  }
  return Object.freeze(timeline);
};

export const homeStoryTimeline = createHomeStoryTimeline();

export const homeStoryTransitionIds = Object.freeze(
  homeStoryTimeline
    .filter(isHomeStoryTransitionSegment)
    .map((segment) => segment.id),
);

export const resolveHomeStoryTimeline = (
  progress: number,
  timeline: readonly HomeStoryTimelineSegment[] = homeStoryTimeline,
) => {
  if (timeline.length === 0) {
    throw new Error("The home story timeline needs at least one segment");
  }

  const normalized = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const segment = timeline.find((item, index) =>
    normalized < item.end || index === timeline.length - 1
  ) ?? timeline[timeline.length - 1];
  const duration = Math.max(Number.EPSILON, segment.end - segment.start);
  const localProgress = Math.min(1, Math.max(0, (normalized - segment.start) / duration));

  return { segment, localProgress };
};

export function isHomeStoryTransitionSegment(
  segment: HomeStoryTimelineSegment,
): segment is HomeStoryTransitionSegment {
  return segment.kind === "transition";
}
