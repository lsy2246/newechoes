import { blindsAdapter } from "./adapters/blinds.ts";
import { crossfadeAdapter } from "./adapters/crossfade.ts";
import { glyphStreamAdapter } from "./adapters/glyphStream.ts";
import { particlesAdapter } from "./adapters/particles.ts";
import { textParticlesAdapter } from "./adapters/textParticles.ts";
import {
  TRANSITION_KINDS,
  hashTransitionSeed,
  type TransitionAdapter,
  type TransitionKind,
  type TransitionSeed,
} from "./types.ts";
import type { HomeMotionPlan } from "../homeMotionPlan.ts";

export type HomeTransitionMode = TransitionKind | "auto";

export type HomeTransitionChapter = Readonly<{
  id: string;
  tags?: readonly string[];
}>;

export type HomeTransitionEdge = Readonly<{
  id: string;
  from: string;
  to: string;
  mode?: HomeTransitionMode | string;
}>;

export type HomeTransitionResolutionInput = Readonly<{
  edge: HomeTransitionEdge;
  from: HomeTransitionChapter;
  to: HomeTransitionChapter;
  seed: TransitionSeed;
  reducedMotion?: boolean;
  motionPlan?: HomeMotionPlan;
}>;

type AutomaticTransitionKind = Exclude<TransitionKind, "crossfade" | "blinds">;

const HOME_TRANSITION_SEMANTICS = {
  "text-particles": new Set([
    "layer",
    "view",
    "reveal",
    "parallel",
    "mask",
    "window",
    "split",
    "fold",
    "uncover",
    "typography",
    "dissolve",
  ]),
  "glyph-stream": new Set([
    "text",
    "writing",
    "protocol",
    "code",
    "language",
    "string",
    "type",
    "copy",
    "syntax",
  ]),
  particles: new Set([
    "network",
    "migrate",
    "assemble",
    "emergence",
    "reassemble",
    "system",
    "nodes",
    "scatter",
    "cluster",
  ]),
} satisfies Record<AutomaticTransitionKind, ReadonlySet<string>>;

const normalizeSemanticToken = (value: string) =>
  value.trim().toLocaleLowerCase().replaceAll("_", "-");

const normalizeExplicitMode = (
  mode: string | null | undefined,
): TransitionKind | null => {
  if (!mode || mode === "auto") return null;
  const normalized = normalizeSemanticToken(mode);
  if (normalized === "glyph" || normalized === "string") return "glyph-stream";
  if (normalized === "particle") return "particles";
  if (normalized === "text-particle" || normalized === "type-particles") {
    return "text-particles";
  }
  if (TRANSITION_KINDS.includes(normalized as TransitionKind)) {
    return normalized as TransitionKind;
  }
  return null;
};

const resolveSemanticHomeTransitionKind = (
  input: HomeTransitionResolutionInput,
): AutomaticTransitionKind => {
  const tokens = [
    input.from.id,
    ...(input.from.tags ?? []),
    input.to.id,
    ...(input.to.tags ?? []),
  ].flatMap((value) =>
    normalizeSemanticToken(value)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
  const candidates = (
    Object.keys(HOME_TRANSITION_SEMANTICS) as Array<
      AutomaticTransitionKind
    >
  ).map((kind) => ({
    kind,
    score: tokens.reduce(
      (score, token) =>
        score + (HOME_TRANSITION_SEMANTICS[kind].has(token) ? 1 : 0),
      0,
    ),
  }));
  const highestScore = Math.max(...candidates.map((candidate) => candidate.score));
  const finalists = candidates.filter(
    (candidate) => candidate.score === highestScore,
  );
  if (finalists.length === 1) return finalists[0]!.kind;

  // Only ties use the seed. This makes semantic intent stable while allowing
  // mixed chapters to pick a deterministic, edge-specific visual grammar.
  const fingerprint = `${input.edge.id}|${input.from.id}|${input.to.id}`;
  const tieIndex =
    hashTransitionSeed(input.seed, `home-transition/${fingerprint}`) %
    finalists.length;
  return finalists[tieIndex]!.kind;
};

export class TransitionRegistry {
  readonly #adapters = new Map<TransitionKind, TransitionAdapter>();

  constructor(adapters: readonly TransitionAdapter[] = []) {
    adapters.forEach((adapter) => this.register(adapter));
  }

  register(adapter: TransitionAdapter) {
    this.#adapters.set(adapter.id, adapter);
    return this;
  }

  get(kind: TransitionKind) {
    return this.#adapters.get(kind);
  }

  resolve(kind: TransitionKind | string | null | undefined) {
    if (kind && TRANSITION_KINDS.includes(kind as TransitionKind)) {
      const requested = this.get(kind as TransitionKind);
      if (requested) return requested;
    }
    const fallback = this.get("crossfade");
    if (!fallback) {
      throw new Error("Transition registry has no crossfade fallback");
    }
    return fallback;
  }

  list() {
    return Object.freeze(Array.from(this.#adapters.values()));
  }
}

export const transitionRegistry = new TransitionRegistry([
  crossfadeAdapter,
  blindsAdapter,
  glyphStreamAdapter,
  particlesAdapter,
  textParticlesAdapter,
]);

/** Homepage-facing name; transitionRegistry remains as the generic alias. */
export const homeTransitionRegistry = transitionRegistry;

export const registerTransitionAdapter = (
  adapter: TransitionAdapter,
) => transitionRegistry.register(adapter);

export const getTransitionAdapter = (kind: TransitionKind) =>
  transitionRegistry.get(kind);

export const resolveTransitionAdapter = (
  kind: TransitionKind | string | null | undefined,
) => transitionRegistry.resolve(kind);

export function resolveHomeTransition(
  kind: TransitionKind | string | null | undefined,
): TransitionAdapter;
export function resolveHomeTransition(
  input: HomeTransitionResolutionInput,
): TransitionAdapter;
export function resolveHomeTransition(
  input:
    | TransitionKind
    | string
    | null
    | undefined
    | HomeTransitionResolutionInput,
) {
  if (typeof input !== "object" || input === null) {
    return homeTransitionRegistry.resolve(input);
  }
  if (input.reducedMotion) {
    return homeTransitionRegistry.resolve("crossfade");
  }
  const explicitMode = normalizeExplicitMode(input.edge.mode);
  if (explicitMode) return homeTransitionRegistry.resolve(explicitMode);
  // Homepage scenes provide a structural plan. Prefer its measured layout and
  // topology decision; tag scoring remains a compatibility fallback for
  // generic callers that do not expose elements.
  if (input.motionPlan) {
    return homeTransitionRegistry.resolve(input.motionPlan.recommendedTransition);
  }
  return homeTransitionRegistry.resolve(resolveSemanticHomeTransitionKind(input));
}

export const listTransitionAdapters = () => transitionRegistry.list();
