# Platform Architecture Design

## Goal

Reorganize platform-specific code so Vercel, EdgeOne, and Cloudflare differences are defined in one consistent system instead of being spread across `astro.config.mjs`, `src/plugins/*`, `src/lib/runtime/*`, and build scripts.

## Problem Summary

The current codebase supports multiple deployment targets, but platform concerns are split across several unrelated areas:

- `astro.config.mjs` contains adapter selection, SSR packaging rules, image config, and EdgeOne compatibility behavior.
- `src/plugins/*` contains both generic build plugins and platform-specific post-build behavior.
- `src/lib/runtime/platform.ts` mixes runtime capability checks with observability setup.
- `scripts/astro-build.mjs` selects a target, but platform normalization lives elsewhere.

This makes it hard to answer basic questions:

- Which files are EdgeOne-only?
- Which logic is build-time vs runtime?
- Where should a new platform workaround live?
- Which behavior is shared across all targets?

## Design Principles

1. One source of truth for platform definitions.
2. Separate build-time platform behavior from runtime platform behavior.
3. Keep platform-specific workarounds isolated under platform-specific directories.
4. Keep generic plugins generic; they should consume platform helpers instead of embedding target checks directly.
5. Make `astro.config.mjs` an assembly file, not a platform policy file.

## Target Structure

```text
src/
  platform/
    shared/
      target.ts
      registry.ts
      types.ts

    runtime/
      capabilities.ts
      observability.ts
      index.ts

    build/
      astro-config.ts
      mirrors.ts
      index.ts

      edgeone/
        adapter.ts
        compat-plugin.ts
        routing-patch.ts

      vercel/
        adapter.ts

      cloudflare/
        adapter.ts
```

The existing generic plugins remain in `src/plugins/`, but they stop owning platform rules themselves.

## Responsibility Model

### `src/platform/shared`

Owns the neutral description of platforms:

- valid deployment target values
- target normalization
- platform metadata types
- per-platform registry data

This layer must not depend on Astro plugin wiring or runtime business modules.

### `src/platform/build`

Owns everything that affects generated output:

- adapter creation
- SSR bundling rules
- image service config
- compatibility plugins
- output mirror roots
- post-build patching

This is the only layer allowed to know about `.edgeone`, `.vercel`, `dist/server`, or adapter-specific output quirks.

### `src/platform/runtime`

Owns everything that affects app behavior after deployment:

- observability script selection
- platform capability flags
- runtime feature support checks

This replaces the current `src/lib/runtime/platform.ts`.

## File Migration Plan

### Move into platform runtime

- `src/lib/runtime/platform.ts`
  - split into:
    - `src/platform/runtime/capabilities.ts`
    - `src/platform/runtime/observability.ts`
    - `src/platform/runtime/index.ts`

### Move into platform build

- `src/plugins/build-output.js`
  - move to `src/platform/build/mirrors.ts|js`
- `src/plugins/edgeone-routing-integration.js`
  - move to `src/platform/build/edgeone/routing-patch.ts|js`

### Extract from `astro.config.mjs`

The following should be removed from direct inline definition and moved behind build helpers:

- `edgeoneCompatPlugin`
- `resolveAdapter`
- `resolveImageConfig`
- `resolveSsrConfig`

`astro.config.mjs` should become a thin composition layer that imports a build descriptor and applies it.

### Keep in place but change dependencies

- `src/plugins/build-article-index.js`
- `src/plugins/sitemap-integration.js`
- `src/plugins/rss-integration.js`
- `src/plugins/robots-integration.js`
- `src/plugins/llms-integration.js`

These stay as generic build plugins, but they should call platform build helpers instead of reading `DEPLOY_TARGET` and output paths directly.

## Proposed Platform Registry Shape

Each platform should be described in one registry entry with both build and runtime sections.

Example shape:

```ts
type PlatformDefinition = {
  target: "vercel" | "edgeone" | "cloudflare";
  build: {
    adapter: unknown;
    imageConfig?: unknown;
    ssr?: {
      noExternal?: string[];
    };
    staticMirrorRoots: string[];
    postBuildPatches: Array<() => Promise<void> | void>;
    includeFiles?: string[];
    compatPlugins?: unknown[];
  };
  runtime: {
    capabilities: {
      vercelInsights: boolean;
      googlePhotosParsing: boolean;
      articleHistory: boolean;
    };
    observability: {
      provider: "vercel" | "edgeone" | "cloudflare";
      bodyScripts: Array<{
        src: string;
        defer?: boolean;
        async?: boolean;
        dataAttributes?: Record<string, string>;
      }>;
    };
  };
};
```

The exact TypeScript shape can be simplified during implementation, but the architecture should follow this model.

## How Existing EdgeOne-Specific Files Should Be Treated

### EdgeOne-only

These are explicitly platform-specific and should live under `src/platform/build/edgeone/`:

- route config patching
- adapter server entrypoint compatibility shim
- EdgeOne-only SSR packaging tweaks if they remain necessary

They should not be presented as shared plugins anymore.

### Shared build logic with platform hooks

These stay generic but depend on platform helpers:

- static file mirroring
- generated index mirroring
- sitemap/rss/robots/llms post-build syncing

### Shared runtime logic

These should stop importing from `src/lib/runtime/platform.ts` and instead import from `src/platform/runtime`.

## `astro.config.mjs` End State

After refactor, `astro.config.mjs` should:

1. resolve the current target once
2. fetch a build descriptor for that target
3. apply descriptor fields into Astro config

It should not define platform-specific helper functions inline except for truly local assembly glue.

## Testing Strategy

Add or update tests to lock down:

- platform target normalization
- static output mirror roots for each platform
- EdgeOne route patching remains EdgeOne-only
- EdgeOne SSR packaging retains `cheerio` bundling
- runtime observability and capability behavior remain unchanged

Existing tests that currently read `astro.config.mjs` directly may need to shift toward testing platform helpers instead of one giant config file.

## Migration Constraints

1. Do not change deployment behavior while reorganizing.
2. Keep build commands unchanged:
   - `pnpm run build:vercel`
   - `pnpm run build:edgeone`
   - `pnpm run build:cloudflare`
3. Preserve current EdgeOne fixes:
   - API slash rewrite patch
   - metadata file syncing
   - search index syncing
   - `cheerio` SSR bundling
4. Preserve current runtime feature flags and observability behavior.

## Recommended Execution Order

1. Introduce shared target and registry primitives.
2. Move runtime platform logic behind the new runtime module.
3. Extract build helpers from `astro.config.mjs`.
4. Migrate output mirror logic into platform build helpers.
5. Relocate EdgeOne-specific build patches under `src/platform/build/edgeone/`.
6. Update generic plugins to consume platform build helpers.
7. Refresh tests to target the new platform architecture.

## Risks

- `astro.config.mjs` refactors can accidentally change build output shape.
- EdgeOne adapter behavior is fragile; the compatibility shim and route patch must survive the move unchanged.
- Tests that assert source text may become brittle during the refactor and should move toward helper-level assertions where possible.

## Success Criteria

The refactor is successful when:

- a new engineer can locate all platform-specific code from the `src/platform/` tree
- `astro.config.mjs` becomes a thin composition file
- `src/plugins/*` no longer own platform path branching directly
- EdgeOne-only workarounds are clearly isolated
- all existing platform builds still pass and produce the same effective behavior
