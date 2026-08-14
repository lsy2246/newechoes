export type HomeStorySceneDevice = "desktop" | "mobile";

export type HomeStorySceneRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type HomeStorySceneElementKind =
  | "heading"
  | "statement"
  | "material"
  | "lane"
  | "project"
  | "status"
  | "contact";

export type HomeStorySceneElement = Readonly<{
  id: string;
  kind: HomeStorySceneElementKind;
  role?: string;
  motionText?: string;
  bounds: Readonly<Record<HomeStorySceneDevice, HomeStorySceneRect>>;
  priority?: number;
}>;

export type HomeStoryScene = Readonly<{
  id: string;
  tags: readonly string[];
  snapshotProgress: number;
  canonicalWeight: number;
  transitionWeight: number;
  elements: readonly HomeStorySceneElement[];
}>;

const rect = (
  desktop: readonly [number, number, number, number],
  mobile: readonly [number, number, number, number],
) => ({
  desktop: {
    x: desktop[0],
    y: desktop[1],
    width: desktop[2],
    height: desktop[3],
  },
  mobile: {
    x: mobile[0],
    y: mobile[1],
    width: mobile[2],
    height: mobile[3],
  },
}) satisfies HomeStorySceneElement["bounds"];

const element = (
  id: string,
  kind: HomeStorySceneElementKind,
  bounds: HomeStorySceneElement["bounds"],
  options: Pick<HomeStorySceneElement, "role" | "motionText" | "priority"> = {},
): HomeStorySceneElement => Object.freeze({ id, kind, bounds, ...options });

/**
 * The scene list is the authored part of the homepage motion system. Ordering,
 * timing and edge plans are derived from this list; adding or reordering a
 * structurally compatible chapter does not require editing the timeline.
 * Bounds are normalized to the story canvas and identify the semantic objects
 * that the planner is allowed to move.
 */
export const homeStoryScenes: readonly HomeStoryScene[] = Object.freeze([
  Object.freeze({
    id: "input",
    tags: ["layer", "view", "reveal"],
    snapshotProgress: 0.36,
    canonicalWeight: 0.36,
    transitionWeight: 0.2,
    elements: Object.freeze([
      element("chapter-heading", "heading", rect([0.17, 0.18, 0.66, 0.08], [0.08, 0.12, 0.84, 0.08]), { priority: 1 }),
      element("chapter-statement", "statement", rect([0.17, 0.27, 0.66, 0.1], [0.08, 0.22, 0.84, 0.12]), { priority: 1 }),
      element("theme-seeing", "material", rect([0.12, 0.43, 0.22, 0.25], [0.1, 0.39, 0.8, 0.13]), { role: "seeing", motionText: "signal" }),
      element("theme-making", "material", rect([0.39, 0.39, 0.22, 0.29], [0.1, 0.54, 0.8, 0.13]), { role: "making", motionText: "route" }),
      element("theme-thinking", "material", rect([0.66, 0.43, 0.22, 0.25], [0.1, 0.69, 0.8, 0.13]), { role: "thinking", motionText: "group" }),
    ]),
  }),
  Object.freeze({
    id: "classify",
    tags: ["parallel", "protocol", "text"],
    snapshotProgress: 0.57,
    canonicalWeight: 0.02,
    transitionWeight: 0.2,
    elements: Object.freeze([
      element("chapter-heading", "heading", rect([0.17, 0.18, 0.66, 0.08], [0.08, 0.1, 0.84, 0.08]), { priority: 1 }),
      element("chapter-statement", "statement", rect([0.17, 0.27, 0.66, 0.1], [0.08, 0.2, 0.84, 0.12]), { priority: 1 }),
      element("theme-seeing", "lane", rect([0.17, 0.43, 0.2, 0.27], [0.09, 0.38, 0.82, 0.15]), { role: "seeing", motionText: "seeing" }),
      element("theme-making", "lane", rect([0.4, 0.43, 0.2, 0.27], [0.09, 0.55, 0.82, 0.15]), { role: "making", motionText: "making" }),
      element("theme-thinking", "lane", rect([0.63, 0.43, 0.2, 0.27], [0.09, 0.72, 0.82, 0.15]), { role: "thinking", motionText: "thinking" }),
    ]),
  }),
  Object.freeze({
    id: "work",
    tags: ["code", "writing", "network", "migrate"],
    snapshotProgress: 0.78,
    canonicalWeight: 0.04,
    transitionWeight: 0.16,
    elements: Object.freeze([
      element("chapter-heading", "heading", rect([0.17, 0.18, 0.66, 0.08], [0.08, 0.1, 0.84, 0.08]), { priority: 1 }),
      element("chapter-statement", "statement", rect([0.17, 0.27, 0.66, 0.1], [0.08, 0.2, 0.84, 0.12]), { priority: 1 }),
      element("project-ennoia", "project", rect([0.17, 0.43, 0.2, 0.29], [0.09, 0.36, 0.82, 0.16]), { role: "seeing", motionText: "agent system", priority: 0.9 }),
      element("project-api-worker", "project", rect([0.4, 0.4, 0.2, 0.32], [0.09, 0.54, 0.82, 0.16]), { role: "making", motionText: "model gateway", priority: 1 }),
      element("project-distilledu", "project", rect([0.63, 0.43, 0.2, 0.29], [0.09, 0.72, 0.82, 0.16]), { role: "thinking", motionText: "study-abroad product", priority: 0.9 }),
    ]),
  }),
  Object.freeze({
    id: "today",
    tags: ["assemble", "emergence"],
    snapshotProgress: 1,
    canonicalWeight: 0.02,
    transitionWeight: 0,
    elements: Object.freeze([
      element("chapter-heading", "heading", rect([0.19, 0.15, 0.3, 0.06], [0.1, 0.1, 0.8, 0.06]), { priority: 1 }),
      element("chapter-statement", "statement", rect([0.19, 0.23, 0.48, 0.12], [0.1, 0.18, 0.8, 0.16]), { priority: 1 }),
      element("project-ennoia", "project", rect([0.19, 0.43, 0.19, 0.22], [0.1, 0.4, 0.8, 0.13]), { role: "seeing", motionText: "trace", priority: 0.9 }),
      element("project-api-worker", "project", rect([0.405, 0.43, 0.19, 0.22], [0.1, 0.55, 0.8, 0.13]), { role: "making", motionText: "tool", priority: 1 }),
      element("project-distilledu", "project", rect([0.62, 0.43, 0.19, 0.22], [0.1, 0.7, 0.8, 0.13]), { role: "thinking", motionText: "memory", priority: 0.9 }),
      element("current-status", "status", rect([0.19, 0.73, 0.36, 0.05], [0.1, 0.86, 0.48, 0.05]), { motionText: "ongoing" }),
      element("current-contact", "contact", rect([0.6, 0.73, 0.21, 0.05], [0.6, 0.86, 0.3, 0.05]), { motionText: "today" }),
    ]),
  }),
]);

export const getHomeStoryScene = (
  id: string,
  scenes: readonly HomeStoryScene[] = homeStoryScenes,
) => scenes.find((scene) => scene.id === id);
