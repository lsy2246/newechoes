# Article Media Viewer Design

## Goal

Add a unified click-to-enlarge viewer to article content so dense Mermaid diagrams and standalone images remain readable without leaving the article.

## Scope

- Standalone images inside `.article-prose` open the viewer.
- Images inside links or buttons keep their original navigation or action.
- Successfully rendered Mermaid blocks open the same viewer.
- The viewer supports wheel zoom, pinch zoom, pointer dragging, zoom buttons, reset, Escape, backdrop close, and a visible close button.
- The viewer uses the approved minimal presentation and adapts to both site themes, coarse and fine pointers, phone safe areas, and portrait or landscape viewports.
- The first version displays one item at a time and has no previous/next gallery navigation.

## Visual Direction

The viewer is an extension of the site's monochrome reading surface, not a separate editing tool. The media remains the dominant object. The full-screen presentation has no visible panel shell, title bar, grid background, rounded card, boxed toolbar, or instruction capsule.

Only three pieces of chrome remain:

- A borderless close action in the top-right corner.
- A quiet bottom-center row for zoom out, percentage, zoom in, and reset.
- A short interaction hint at the bottom-left when the viewport has enough room; it is omitted on compact screens.

Controls use bare glyphs or text and retain at least a 44 by 44 CSS-pixel hit target. They remain visible rather than relying on hover or timed auto-hide. Photos keep their natural bounds without an imposed frame. Mermaid SVG stays vector-sharp and may use the current article background directly behind the diagram when needed for contrast.

## Architecture

`article-media-transform.ts` owns pure fit, clamp, and anchored-zoom calculations. `article-media-viewer.ts` owns DOM discovery, accessibility decoration, the native dialog, pointer gesture state, cleanup, and source cloning. Keeping the geometry independent makes zoom behavior directly testable without a browser DOM.

The article page boots the viewer on the initial load. Swup boots it again after article navigation, matching the existing Mermaid lifecycle. A visit start closes an open dialog without disabling the current article; permanent cleanup waits until Swup actually replaces the content. Each initialization first cleans up the prior instance so listeners, observers, dialogs, and scroll locks cannot accumulate.

## Components and Data Flow

1. The controller scans `.article-prose` for standalone `img` elements and ready `pre.mermaid` elements.
2. A mutation observer reconciles Mermaid decorations after asynchronous rendering, removing viewer-owned semantics again if a diagram returns to loading or error state.
3. Click, Enter, or Space identifies the selected source and opens a modal `<dialog>`.
4. Raster images use their current responsive URL. Mermaid SVG is cloned with locally rewritten IDs and fragment references so it stays vector-sharp without duplicate DOM identifiers.
5. The stage measures the intrinsic media size and calculates a centered fit transform.
6. Wheel, pointer, and control events update `{ scale, x, y }` through the pure transform helpers, then render one CSS transform.
7. Closing or navigating revokes all transient state, removes the dialog, restores page scrolling, and returns focus when the source still exists.

## Theme Adaptation

- Light and dark modes reuse `--article-bg`, `--article-ink`, `--article-muted`, `--article-line`, and the existing focus token instead of defining a parallel palette.
- The backdrop remains near-black in both themes so photographs and diagrams have stable contrast. Dark mode uses a slightly stronger opacity; this is a deliberate viewer token rather than an inversion of `--article-ink`.
- On-backdrop controls resolve to `--article-bg` in light mode and `--article-ink` in dark mode. Close, zoom, percentage, reset, hint, and focus states therefore remain readable against the near-black backdrop.
- Mermaid content uses the theme in which it was rendered. Switching the document theme updates surrounding viewer chrome through CSS variables without requiring viewer reinitialization.
- Transparent media receives no checkerboard or decorative grid. If a Mermaid SVG needs a surface, it uses `--article-bg` with no border, radius, or shadow.

## Device and Input Adaptation

- The dialog occupies `100dvh` and uses logical safe-area padding from `env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-bottom)`, and `env(safe-area-inset-left)`.
- Desktop and laptop: wheel zoom anchors under the cursor; mouse or pen drag pans; all controls are keyboard reachable with visible focus.
- Tablet and touch laptop: pinch zoom anchors at the gesture center; one-finger drag pans; controls do not depend on hover.
- Phone portrait: the interaction hint is hidden, controls keep 44-pixel hit targets above the bottom safe area, and the close action clears the top and right safe areas.
- Phone landscape or other short viewports: vertical margins shrink, the hint stays hidden, and the fit area reserves space for close and zoom controls so media is not obscured.
- Window resize, `visualViewport` resize, orientation change, and mobile browser chrome changes recompute a centered fit transform. No state may leave the media unreachable or create page-level horizontal scrolling.
- The initial fit never upscales raster images beyond their intrinsic size. Users may zoom manually within the existing minimum and maximum scale limits.

## Accessibility

- Zoomable sources receive keyboard focus and a descriptive button role without changing linked images.
- The native dialog provides modal focus containment.
- Controls have Chinese accessible names and visible focus rings.
- Minimal visual chrome does not remove semantic labels or reduce pointer targets below 44 by 44 CSS pixels.
- Escape and an explicit close button always work.
- Reduced-motion preferences remove opening and control transitions.
- Focus returns to the invoking source after close when possible.

## Error Handling

Images that have not loaded or Mermaid blocks without a rendered SVG are not opened. If a source disappears during a Swup transition, cleanup closes and removes the viewer without restoring focus into detached content. Resize events recompute the fit transform to avoid leaving content off-screen after orientation changes.

## Testing

- Unit tests cover fit-to-stage sizing, anchored zoom, scale limits, and pan clamping.
- Contract tests cover article-page boot, Swup reboot, linked-image exclusion, Mermaid readiness, dialog semantics, keyboard access, stylesheet inclusion, theme-token use, safe-area placement, minimum touch targets, and the absence of the previous grid and boxed shell presentation.
- The full test suite and production build verify integration.
- Browser smoke tests use both light and dark themes at desktop (1440 by 900), tablet (1024 by 768), phone portrait (390 by 844), and phone landscape (844 by 390) sizes.
- Each browser pass verifies open, initial fit, zoom, drag, reset, close, focus return, navigation cleanup, no clipped controls, no media/control overlap at initial fit, and no horizontal overflow.
- Coarse-pointer coverage verifies pinch and one-finger pan behavior; keyboard coverage verifies source activation, focus order, Escape, and visible focus; reduced-motion coverage verifies that transitions are disabled.
