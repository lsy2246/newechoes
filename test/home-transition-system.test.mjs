import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  homeTransitionRegistry,
  resolveHomeTransition,
} from "../src/components/home/transitions/registry.ts";
import {
  createHomeStoryTimeline,
  homeStoryTimeline,
  homeStoryTransitionIds,
  isHomeStoryTransitionSegment,
  resolveHomeStoryTimeline,
} from "../src/components/home/timeline.ts";
import { installHomeTransitionRuntime } from "../src/components/home/homeTransitionRuntime.ts";
import { homeStoryScenes } from "../src/components/home/homeStoryScenes.ts";
import {
  createHomeMotionPlan,
  motionPlanGlyphs,
} from "../src/components/home/homeMotionPlan.ts";
import { textParticleScanProgress } from "../src/components/home/transitions/adapters/textParticles.ts";

const EXPECTED_TRANSITIONS = [
  "blinds",
  "crossfade",
  "glyph-stream",
  "particles",
  "text-particles",
];

const storySource = readFileSync("src/components/home/homeScreenStory.ts", "utf8");
const glyphAdapterSource = readFileSync(
  "src/components/home/transitions/adapters/glyphStream.ts",
  "utf8",
);
const textParticleAdapterSource = readFileSync(
  "src/components/home/transitions/adapters/textParticles.ts",
  "utf8",
);
const dioramaSource = readFileSync("src/components/home/diorama.ts", "utf8");
const dioramaMarkup = readFileSync("src/components/home/HomeDiorama.astro", "utf8");
const dioramaStyles = readFileSync("src/components/home/diorama.css", "utf8");

const chapter = (id, tags) => ({ id, tags });

const edge = (from, to, mode = "auto") => ({
  id: `${from.id}->${to.id}`,
  from: from.id,
  to: to.id,
  mode,
});

const resolveEdge = ({ from, to, mode = "auto", seed = "home-story" }) =>
  resolveHomeTransition({
    edge: edge(from, to, mode),
    from,
    to,
    seed,
  });

const segmentBounds = (segment) => {
  const start = segment.start ?? segment.fromProgress;
  const end = segment.end ?? segment.toProgress;

  assert.equal(typeof start, "number", `timeline segment ${segment.id} needs a numeric start`);
  assert.equal(typeof end, "number", `timeline segment ${segment.id} needs a numeric end`);
  return { start, end };
};

const resolvedFingerprint = (progress) => {
  const resolved = resolveHomeStoryTimeline(progress, homeStoryTimeline);

  assert.ok(resolved, `timeline should resolve progress ${progress}`);
  assert.ok(resolved.segment, `timeline should return a segment at ${progress}`);
  assert.equal(typeof resolved.segment.id, "string");
  assert.equal(typeof resolved.localProgress, "number");
  assert.ok(
    resolved.localProgress >= 0 && resolved.localProgress <= 1,
    `local progress should stay normalized at ${progress}`,
  );

  return {
    segmentId: resolved.segment.id,
    localProgress: Number(resolved.localProgress.toFixed(10)),
  };
};

test("registers the five built-in home transition adapters", () => {
  const registered = homeTransitionRegistry.list();
  const ids = registered.map((adapter) => adapter.id).sort();

  assert.equal(registered.length, 5);
  assert.deepEqual(ids, EXPECTED_TRANSITIONS);
});

test("auto mode selects a transition from chapter semantics", () => {
  const reveal = resolveEdge({
    from: chapter("unordered", ["layer", "view"]),
    to: chapter("notice", ["reveal", "parallel"]),
  });
  const language = resolveEdge({
    from: chapter("traces", ["text", "writing"]),
    to: chapter("between", ["protocol", "code"]),
  });
  const reassembly = resolveEdge({
    from: chapter("in-transit", ["network", "migrate"]),
    to: chapter("boundaries", ["assemble", "emergence"]),
  });

  assert.equal(reveal.id, "text-particles");
  assert.equal(language.id, "glyph-stream");
  assert.equal(reassembly.id, "particles");
});

test("homepage auto mode is driven by structural motion plans", () => {
  const plans = homeStoryScenes.slice(0, -1).map((scene, index) =>
    createHomeMotionPlan(scene, homeStoryScenes[index + 1], "desktop"),
  );

  assert.deepEqual(
    plans.map((plan) => plan.recommendedTransition),
    ["text-particles", "glyph-stream", "particles"],
  );
  assert.equal(plans[0].metrics.replacements, 0);
  assert.ok(plans[1].metrics.replacementRate >= 0.45);
  assert.ok(plans[2].metrics.topologyChange > 0);

  for (const plan of plans) {
    const segment = homeStoryTimeline.find(
      (item) => isHomeStoryTransitionSegment(item) && item.id === plan.id,
    );
    const adapter = resolveHomeTransition({
      edge: segment.edge,
      from: segment.from,
      to: segment.to,
      seed: "structural-plan",
      motionPlan: plan,
    });
    assert.equal(adapter.id, plan.recommendedTransition);
  }
});

test("glyph transition reorganizes canonical pixels without drawing extra words", () => {
  assert.doesNotMatch(glyphAdapterSource, /\.fillText\s*\(/);
  assert.match(glyphAdapterSource, /drawReactionSlice/);
});

test("text particles sample real canvas typography without inventing labels", () => {
  assert.match(textParticleAdapterSource, /getImageData/);
  assert.match(textParticleAdapterSource, /motionPlan\.operations/);
  assert.doesNotMatch(textParticleAdapterSource, /\.fillText\s*\(/);
  assert.doesNotMatch(textParticleAdapterSource, /Math\.random/);
  assert.match(textParticleAdapterSource, /real reaction band/);
  assert.match(textParticleAdapterSource, /const featherSteps = 4/);
  assert.match(textParticleAdapterSource, /drawFeatherStrip/);
  assert.match(textParticleAdapterSource, /drawTextParticleScanLine/);
  assert.match(textParticleAdapterSource, /scanLineRange/);
  assert.match(textParticleAdapterSource, /ctx\.moveTo\(frontier, lineTop\)/);
  assert.match(textParticleAdapterSource, /ctx\.lineTo\(frontier, lineBottom\)/);
});

test("text particle scan remains normalized and reversible", () => {
  let previous = 0;
  for (let index = 0; index <= 1_000; index += 1) {
    const progress = textParticleScanProgress(index / 1_000);
    assert.ok(progress >= 0 && progress <= 1);
    assert.ok(progress >= previous);
    previous = progress;
  }
  assert.equal(textParticleScanProgress(0), 0);
  assert.equal(textParticleScanProgress(1), 1);
  assert.match(textParticleAdapterSource, /real reaction band/);
  assert.match(textParticleAdapterSource, /ctx\.drawImage\(input\.to[\s\S]*?ctx\.drawImage\(input\.from/);
  assert.doesNotMatch(textParticleAdapterSource, /fillRect\(frontier/);
});

test("motion plans match stable identities before role-based replacements", () => {
  const stable = createHomeMotionPlan(homeStoryScenes[0], homeStoryScenes[1], "desktop");
  const replacements = createHomeMotionPlan(homeStoryScenes[1], homeStoryScenes[2], "desktop");

  assert.ok(stable.operations.every((operation) => operation.kind !== "replace"));
  assert.deepEqual(
    replacements.operations
      .filter((operation) => operation.kind === "replace")
      .map((operation) => `${operation.fromId}->${operation.toId}`)
      .sort(),
    [
      "theme-making->project-api-worker",
      "theme-seeing->project-ennoia",
      "theme-thinking->project-distilledu",
    ],
  );
  assert.deepEqual(
    motionPlanGlyphs(replacements).map(({ fromText, toText }) => `${fromText}->${toText}`).sort(),
    [
      "making->model gateway",
      "seeing->agent system",
      "thinking->study-abroad product",
    ],
  );
  assert.deepEqual(
    createHomeMotionPlan(homeStoryScenes[1], homeStoryScenes[2], "desktop"),
    replacements,
    "planning must remain deterministic for reversible scroll",
  );
});

test("timeline edges are regenerated when scenes are reordered or omitted", () => {
  const generated = createHomeStoryTimeline([
    homeStoryScenes[0],
    homeStoryScenes[2],
    homeStoryScenes[3],
  ]);
  const edges = generated
    .filter(isHomeStoryTransitionSegment)
    .map((segment) => segment.id);

  assert.deepEqual(edges, ["input-to-work", "work-to-today"]);
  assert.equal(generated[0].start, 0);
  assert.equal(generated.at(-1).end, 1);
});

test("an explicit edge mode overrides automatic semantic selection", () => {
  const resolved = resolveEdge({
    from: chapter("notice", ["layer", "reveal"]),
    to: chapter("between", ["view", "parallel"]),
    mode: "particles",
  });

  assert.equal(resolved.id, "particles");
});

test("reduced motion always falls back to crossfade", () => {
  const from = chapter("between", ["protocol", "code"]);
  const to = chapter("in-transit", ["network", "migrate"]);
  const resolved = resolveHomeTransition({
    edge: edge(from, to, "particles"),
    from,
    to,
    seed: "reduced-motion",
    reducedMotion: true,
  });

  assert.equal(resolved.id, "crossfade");
});

test("the same edge and seed resolve deterministically", () => {
  const from = chapter("mixed-source", ["text", "network"]);
  const to = chapter("mixed-target", ["protocol", "assemble"]);
  const input = {
    edge: edge(from, to),
    from,
    to,
    seed: "stable-seed",
  };

  const first = resolveHomeTransition(input);
  const second = resolveHomeTransition(input);

  assert.equal(second.id, first.id);
  assert.deepEqual(second.variant ?? null, first.variant ?? null);
});

test("the runtime switches global and per-edge modes without reloading", () => {
  const originalWindow = globalThis.window;
  const fakeWindow = new EventTarget();
  fakeWindow.location = { search: "?home-transition=blinds" };
  const changes = [];
  const events = [];
  fakeWindow.addEventListener("home:transition-change", (event) => {
    events.push(event.detail);
  });
  globalThis.window = fakeWindow;

  try {
    const runtime = installHomeTransitionRuntime((config) => changes.push(config));
    assert.equal(runtime.api.getConfig().mode, "blinds");
    assert.ok(runtime.api.list().includes("auto"));
    assert.deepEqual(runtime.api.edges(), homeStoryTransitionIds);
    assert.equal(
      runtime.api.getPlan("classify-to-work").recommendedTransition,
      "glyph-stream",
    );

    const globalSwitch = runtime.api.setMode("glyph-stream");
    const edgeSwitch = runtime.api.setEdge("work-to-today", "particles");
    const edgeReset = runtime.api.setEdge("work-to-today", null);

    assert.equal(globalSwitch.mode, "glyph-stream");
    assert.equal(edgeSwitch.edges["work-to-today"], "particles");
    assert.equal(edgeReset.edges["work-to-today"], undefined);
    assert.deepEqual(changes, events);
    assert.equal(changes.length, 3);
    assert.throws(() => runtime.api.setMode("unknown"), TypeError);

    runtime.dispose();
    assert.equal(fakeWindow.homeTransitions, undefined);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("mobile keeps the completed work snapshot stable between transition edges", () => {
  assert.match(
    storySource,
    /input\.device === "mobile" && resolved\.segment\.id === "work"[\s\S]*?snapshotScene: "work"/,
  );
});

test("prepared snapshots keep texture and overlay layout metrics separate", () => {
  const cacheKey = storySource.match(/const key = \[[\s\S]*?\]\.join\("\|"\);/)?.[0] ?? "";

  assert.ok(cacheKey.includes("ctx.canvas.width"));
  assert.ok(cacheKey.includes("ctx.canvas.height"));
  assert.ok(cacheKey.includes("input.pixelRatio ?? 1"));
  assert.ok(cacheKey.includes("input.layoutPixelRatio ?? input.pixelRatio ?? 1"));
  assert.ok(cacheKey.includes("input.designLayoutScale ?? input.layoutPixelRatio ?? 1"));
  assert.match(
    storySource,
    /designLayoutScale: Math\.max\([\s\S]*?input\.designLayoutScale \?\? input\.layoutPixelRatio \?\? 1/,
  );
});

test("the home story timeline covers every boundary without gaps", () => {
  assert.ok(Array.isArray(homeStoryTimeline));
  assert.ok(homeStoryTimeline.length > 0);

  const bounds = homeStoryTimeline.map(segmentBounds);
  const epsilon = 1e-9;

  assert.ok(Math.abs(bounds[0].start) <= epsilon, "timeline should begin at 0");
  assert.ok(
    Math.abs(bounds.at(-1).end - 1) <= epsilon,
    "timeline should end at 1",
  );

  for (let index = 0; index < bounds.length; index += 1) {
    const current = bounds[index];
    assert.ok(current.end > current.start, "every timeline segment should have duration");

    if (index === bounds.length - 1) continue;
    const next = bounds[index + 1];
    assert.ok(
      Math.abs(current.end - next.start) <= epsilon,
      `timeline segments ${homeStoryTimeline[index].id} and ${homeStoryTimeline[index + 1].id} should share a boundary`,
    );
  }

  for (let step = 0; step <= 1_000; step += 1) {
    resolvedFingerprint(step / 1_000);
  }
});

test("the evidence chapter is real document content with consistent paced input", () => {
  assert.match(dioramaMarkup, /data-home-evidence/);
  assert.match(dioramaMarkup, /data-home-motion/);
  assert.match(dioramaMarkup, /home-evidence__item/);
  assert.match(dioramaMarkup, /data-home-beat="work-overview"/);
  assert.match(dioramaMarkup, /data-home-beat=\{workBeatIds\[index\]\}/);
  assert.match(dioramaMarkup, /data-home-beat="work-release"/);
  assert.match(dioramaStyles, /\.home-diorama-motion\s*\{[\s\S]*?min-height:\s*680dvh/);
  assert.match(dioramaStyles, /\.home-diorama-motion--with-flow\s*\{[\s\S]*?min-height:\s*1036dvh/);
  assert.match(dioramaStyles, /\.home-evidence\s*\{[\s\S]*?position:\s*absolute[\s\S]*?top:\s*277dvh[\s\S]*?min-height:\s*348dvh/);
  assert.match(dioramaSource, /const scrollRangeEl = motionEl \?\? shellEl/);
  assert.match(dioramaSource, /const WORK_FLOW_START_PROGRESS = STORY_MODE_END \* 0\.58/);
  assert.match(dioramaSource, /const WORK_FLOW_RESUME_PROGRESS = STORY_MODE_END \* 0\.82/);
  assert.match(
    dioramaSource,
    /physicalScroll <= metrics\.flowStart[\s\S]*?metrics\.flowStartProgress[\s\S]*?physicalScroll \/ Math\.max\(1, metrics\.flowStart\)/,
  );
  assert.match(
    dioramaSource,
    /targetProgress <= metrics\.flowStartProgress[\s\S]*?metrics\.flowStart \* clamp[\s\S]*?targetProgress \/ Math\.max\(Number\.EPSILON, metrics\.flowStartProgress\)/,
  );
  assert.match(dioramaSource, /physicalScroll < metrics\.flowEnd[\s\S]*?metrics\.flowEndProgress/);
  assert.doesNotMatch(dioramaSource, /isEvidenceFlowActive\(\) &&[\s\S]*?isFastHomeScrollInput/);
  assert.match(dioramaSource, /startupGateReleased && !evidenceFlowActive/);
  assert.match(dioramaSource, /const getWorkTodayPushState = \(\) =>/);
  assert.match(dioramaStyles, /\.home-evidence__item\[data-home-beat="work-distilledu"\]\s*\{[\s\S]*?position:\s*sticky[\s\S]*?top:\s*0[\s\S]*?min-height:\s*100dvh/);
  assert.match(dioramaStyles, /\.home-evidence__release\s*\{[\s\S]*?min-height:\s*118dvh/);
  assert.match(dioramaMarkup, /data-home-work-push-frame/);
  assert.match(dioramaStyles, /data-work-push-active[\s\S]*?\.home-evidence__item-frame\s*\{[\s\S]*?position:\s*fixed[\s\S]*?inset:\s*0/);
  assert.match(dioramaStyles, /data-work-push-active[\s\S]*?\.home-evidence__item\[data-home-beat="work-distilledu"\]\s*\{[\s\S]*?background:\s*transparent[\s\S]*?border-bottom-color:\s*transparent/);
  assert.match(dioramaStyles, /\.home-evidence__item\[data-home-beat="work-distilledu"\] \.home-evidence__item-frame\s*\{[\s\S]*?transition:\s*transform 120ms/);
  assert.match(dioramaSource, /evidenceReleaseEl\.offsetTop - lastEvidenceItemEl\.offsetHeight/);
  assert.match(dioramaSource, /const pushStart = landedAt \+ holdDistance/);
  assert.match(dioramaSource, /HOME_MOTION_TIMING\.workToday\.holdBeforeViewport/);
  assert.match(dioramaSource, /landed:\s*physicalScroll >= landedAt/);
  assert.match(dioramaSource, /workTodayPush\.landed[\s\S]*?translate3d\(\$\{window\.innerWidth\}px, 0, 0\)/);
  assert.match(dioramaSource, /metrics\.flowEnd - settleDistance/);
  assert.match(dioramaSource, /workPushFrameEl\.style\.transform = `translate3d\(\$\{-horizontalTravel\}px, 0, 0\)`/);
  assert.doesNotMatch(dioramaSource, /workTodayPush\.pinY/);
  assert.match(dioramaSource, /storyEl\.style\.transform = `translate3d\(\$\{window\.innerWidth - horizontalTravel\}px, 0, 0\)`/);
  assert.match(
    dioramaSource,
    /if \(renderMode !== "loop" && getWorkTodayPushState\(\)\.landed\) return 1/,
  );
});

test("timeline resolution is reversible on both sides of every boundary", () => {
  const checkpoints = new Set([0, 1]);

  for (let index = 0; index < homeStoryTimeline.length - 1; index += 1) {
    const left = segmentBounds(homeStoryTimeline[index]);
    const right = segmentBounds(homeStoryTimeline[index + 1]);
    const boundary = left.end;
    const offset = Math.min(left.end - left.start, right.end - right.start) / 1_000;

    checkpoints.add(boundary - offset);
    checkpoints.add(boundary);
    checkpoints.add(boundary + offset);

    assert.equal(
      resolveHomeStoryTimeline(boundary - offset, homeStoryTimeline).segment.id,
      homeStoryTimeline[index].id,
    );
    assert.equal(
      resolveHomeStoryTimeline(boundary + offset, homeStoryTimeline).segment.id,
      homeStoryTimeline[index + 1].id,
    );
  }

  const forwardProgress = [...checkpoints].sort((a, b) => a - b);
  const forward = forwardProgress.map(resolvedFingerprint);
  const backward = [...forwardProgress]
    .reverse()
    .map(resolvedFingerprint)
    .reverse();

  assert.deepEqual(backward, forward);
});
  assert.match(dioramaSource, /const WORK_FLOW_START_PROGRESS = STORY_MODE_END \* 0\.58/);
