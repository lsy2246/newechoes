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
