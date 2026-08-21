import type {
  HomeStoryScene,
  HomeStorySceneDevice,
  HomeStorySceneElement,
  HomeStorySceneRect,
} from "./homeStoryTypes.ts";

export type HomeMotionOperationKind = "hold" | "move" | "replace" | "enter" | "exit";
export type HomeMotionPath = "linear" | "orthogonal" | "arc";

export type HomeMotionOperation = Readonly<{
  id: string;
  kind: HomeMotionOperationKind;
  elementKind: HomeStorySceneElement["kind"];
  fromId?: string;
  toId?: string;
  from?: HomeStorySceneRect;
  to?: HomeStorySceneRect;
  fromText?: string;
  toText?: string;
  path: HomeMotionPath;
  distance: number;
  delay: number;
  priority: number;
}>;

export type HomeMotionPlanMetrics = Readonly<{
  matched: number;
  entering: number;
  exiting: number;
  replacements: number;
  topologyChange: number;
  layoutShift: number;
  replacementRate: number;
}>;

export type HomeMotionTransitionKind =
  | "blinds"
  | "glyph-stream"
  | "particles"
  | "text-particles";

export type HomeMotionPlan = Readonly<{
  id: string;
  from: string;
  to: string;
  device: HomeStorySceneDevice;
  operations: readonly HomeMotionOperation[];
  axis: "x" | "y";
  direction: -1 | 1;
  recommendedTransition: HomeMotionTransitionKind;
  metrics: HomeMotionPlanMetrics;
}>;

const center = (rect: HomeStorySceneRect) => ({
  x: rect.x + rect.width * 0.5,
  y: rect.y + rect.height * 0.5,
});

const rectDistance = (from: HomeStorySceneRect, to: HomeStorySceneRect) => {
  const fromCenter = center(from);
  const toCenter = center(to);
  return Math.hypot(toCenter.x - fromCenter.x, toCenter.y - fromCenter.y);
};

const compatibility = (
  from: HomeStorySceneElement,
  to: HomeStorySceneElement,
  device: HomeStorySceneDevice,
) => {
  let score = 0;
  if (from.kind === to.kind) score += 4;
  if (from.role && from.role === to.role) score += 8;
  if (from.motionText && from.motionText === to.motionText) score += 2;
  score -= rectDistance(from.bounds[device], to.bounds[device]) * 2;
  return score;
};

const choosePath = (
  from: HomeStorySceneRect,
  to: HomeStorySceneRect,
  kind: HomeMotionOperationKind,
): HomeMotionPath => {
  if (kind === "replace") return "orthogonal";
  const fromCenter = center(from);
  const toCenter = center(to);
  const dx = Math.abs(toCenter.x - fromCenter.x);
  const dy = Math.abs(toCenter.y - fromCenter.y);
  if (dx > 0.12 && dy > 0.12) return "arc";
  return "linear";
};

type Match = Readonly<{
  from: HomeStorySceneElement;
  to: HomeStorySceneElement;
}>;

const matchSceneElements = (
  from: HomeStoryScene,
  to: HomeStoryScene,
  device: HomeStorySceneDevice,
) => {
  const unmatchedFrom = new Map(from.elements.map((element) => [element.id, element]));
  const unmatchedTo = new Map(to.elements.map((element) => [element.id, element]));
  const matches: Match[] = [];

  // Stable identity is authoritative.
  for (const fromElement of from.elements) {
    const toElement = unmatchedTo.get(fromElement.id);
    if (!toElement) continue;
    matches.push({ from: fromElement, to: toElement });
    unmatchedFrom.delete(fromElement.id);
    unmatchedTo.delete(toElement.id);
  }

  // Remaining elements are paired by role/kind and then spatial proximity.
  for (const fromElement of [...unmatchedFrom.values()]) {
    const candidate = [...unmatchedTo.values()]
      .map((toElement) => ({
        toElement,
        score: compatibility(fromElement, toElement, device),
      }))
      .filter(({ score }) => score >= 3)
      .sort((left, right) => right.score - left.score)[0];
    if (!candidate) continue;
    matches.push({ from: fromElement, to: candidate.toElement });
    unmatchedFrom.delete(fromElement.id);
    unmatchedTo.delete(candidate.toElement.id);
  }

  return {
    matches,
    exiting: [...unmatchedFrom.values()],
    entering: [...unmatchedTo.values()],
  };
};

const planRecommendation = (metrics: HomeMotionPlanMetrics): HomeMotionTransitionKind => {
  // This is structural routing, not keyword "semantics": replacements favor
  // glyph motion, high churn/reflow favors the topology frontier, and stable
  // layouts dissolve their real typography into a new composition. Blinds
  // remains available as a manual legacy option, never the automatic default.
  if (metrics.replacementRate >= 0.45) return "glyph-stream";
  if (metrics.topologyChange + metrics.layoutShift >= 0.2) return "particles";
  return "text-particles";
};

export const createHomeMotionPlan = (
  from: HomeStoryScene,
  to: HomeStoryScene,
  device: HomeStorySceneDevice,
): HomeMotionPlan => {
  const matched = matchSceneElements(from, to, device);
  const operations: HomeMotionOperation[] = [];
  let totalDx = 0;
  let totalDy = 0;
  let replacements = 0;

  matched.matches.forEach((match, index) => {
    const fromBounds = match.from.bounds[device];
    const toBounds = match.to.bounds[device];
    const fromCenter = center(fromBounds);
    const toCenter = center(toBounds);
    const textChanged =
      match.from.id !== match.to.id &&
      Boolean(match.from.motionText || match.to.motionText) &&
      match.from.motionText !== match.to.motionText;
    const distance = rectDistance(fromBounds, toBounds);
    const kind: HomeMotionOperationKind = textChanged
      ? "replace"
      : distance < 0.012
        ? "hold"
        : "move";
    if (textChanged) replacements += 1;
    totalDx += toCenter.x - fromCenter.x;
    totalDy += toCenter.y - fromCenter.y;
    operations.push({
      id: `${match.from.id}->${match.to.id}`,
      kind,
      elementKind: match.to.kind,
      fromId: match.from.id,
      toId: match.to.id,
      from: fromBounds,
      to: toBounds,
      fromText: match.from.motionText,
      toText: match.to.motionText,
      path: choosePath(fromBounds, toBounds, kind),
      distance,
      delay: index * 0.025,
      priority: Math.max(match.from.priority ?? 0.5, match.to.priority ?? 0.5),
    });
  });

  matched.exiting.forEach((element, index) => {
    operations.push({
      id: `${element.id}->exit`,
      kind: "exit",
      elementKind: element.kind,
      fromId: element.id,
      from: element.bounds[device],
      fromText: element.motionText,
      path: "arc",
      distance: 0.12,
      delay: (matched.matches.length + index) * 0.025,
      priority: element.priority ?? 0.5,
    });
  });

  matched.entering.forEach((element, index) => {
    operations.push({
      id: `enter->${element.id}`,
      kind: "enter",
      elementKind: element.kind,
      toId: element.id,
      to: element.bounds[device],
      toText: element.motionText,
      path: "arc",
      distance: 0.12,
      delay:
        (matched.matches.length + matched.exiting.length + index) * 0.025,
      priority: element.priority ?? 0.5,
    });
  });

  const structuralTotal = Math.max(1, from.elements.length + to.elements.length);
  const metrics: HomeMotionPlanMetrics = {
    matched: matched.matches.length,
    entering: matched.entering.length,
    exiting: matched.exiting.length,
    replacements,
    topologyChange:
      (matched.entering.length + matched.exiting.length) / structuralTotal,
    layoutShift:
      matched.matches.reduce((sum, match) =>
        sum + rectDistance(match.from.bounds[device], match.to.bounds[device]), 0) /
      Math.max(1, matched.matches.length),
    replacementRate: replacements / Math.max(1, matched.matches.length),
  };
  const axis = Math.abs(totalDx) >= Math.abs(totalDy) ? "x" : "y";
  const signedTravel = axis === "x" ? totalDx : totalDy;

  return Object.freeze({
    id: `${from.id}-to-${to.id}`,
    from: from.id,
    to: to.id,
    device,
    operations: Object.freeze(
      operations.sort(
        (left, right) =>
          right.priority - left.priority || left.delay - right.delay,
      ),
    ),
    axis,
    direction: signedTravel < 0 ? -1 : 1,
    recommendedTransition: planRecommendation(metrics),
    metrics: Object.freeze(metrics),
  });
};

export const createHomeMotionPlans = (
  scenes: readonly HomeStoryScene[],
  device: HomeStorySceneDevice,
) => Object.freeze(
  scenes.slice(0, -1).map((scene, index) =>
    createHomeMotionPlan(scene, scenes[index + 1]!, device),
  ),
);

export const findHomeMotionPlan = (
  edgeId: string,
  plans: readonly HomeMotionPlan[],
) => plans.find((plan) => plan.id === edgeId);

const motionTextAnchor = (
  rect: HomeStorySceneRect,
  operation: HomeMotionOperation,
) => operation.kind === "replace"
  ? {
      // Replacement text is authored as the visible mono eyebrow at the top
      // of each lane/card. Using its real baseline makes extraction and merge
      // continuous instead of spawning a label from the card centre.
      x: rect.x + rect.width * 0.04,
      y: rect.y + rect.height * 0.09,
    }
  : center(rect);

export const motionPlanGlyphs = (plan: HomeMotionPlan) =>
  plan.operations.flatMap((operation) => {
    const from = operation.from
      ? motionTextAnchor(operation.from, operation)
      : operation.to
        ? motionTextAnchor(operation.to, operation)
        : undefined;
    const to = operation.to
      ? motionTextAnchor(operation.to, operation)
      : operation.from
        ? motionTextAnchor(operation.from, operation)
        : undefined;
    if (!from || !to) return [];
    const fromText = operation.fromText;
    const toText = operation.toText;
    const text = toText ?? fromText;
    if (!text) return [];
    return [{
      text,
      fromText: fromText ?? text,
      toText: toText ?? text,
      from,
      to,
    }];
  });
