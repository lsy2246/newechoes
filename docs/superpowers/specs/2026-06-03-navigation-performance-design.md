# Navigation Performance Design

**Goal:** Reduce homepage-to-first-navigation latency by removing heavyweight global work from the critical path.

**Scope:** This pass targets four bottlenecks only: eager global graph payload/script delivery, eager search hydration/index boot, eager homepage 3D startup, and swup navigation asset waiting.

## Design

1. Global graph becomes on-demand.
   The header will keep only the launcher button and an empty mount root. The heavy modal markup will move to a dedicated static fragment page, and the graph runtime will be dynamically imported on first open.

2. Search becomes intent-driven.
   The header will render lightweight placeholders instead of eagerly hydrated `Search` islands. When the user clicks the desktop search shell or opens mobile search, a lazy loader will import React, `Search.tsx`, and mount the component into the placeholder.

3. Homepage 3D starts after idle time.
   The homepage diorama bootstrap will be delayed with an idle callback plus timeout fallback, and pending startup work will be canceled on navigation away from `/`.

4. Swup stops competing with first navigation.
   Visible-link preloading will be removed, and head sync will stop waiting for all route assets before showing the next page.

## Success Criteria

- Non-home pages no longer embed the full global graph modal payload in their initial HTML.
- Header source no longer eagerly hydrates `Search` with `client:idle`.
- Homepage diorama bootstrap is scheduled, not started immediately on parse.
- Swup no longer enables visible-link preloading or `awaitAssets: true`.
