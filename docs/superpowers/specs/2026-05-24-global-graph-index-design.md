# Global Graph Index Design

## Goal

Refine the global graph modal so it feels cleaner and easier to manipulate:

- Redesign the left text index as a compact file-sidebar style tree.
- Remove the 2D point cloud legend.
- Make dragging feel higher priority than accidental point clicks.
- Give the 2D point cloud a subtle autonomous motion so it feels alive without becoming unstable.

## Scope

- Update the global graph modal structure in `src/components/GlobalGraphModal.astro` only where needed for copy or removing obsolete legend markup.
- Update global graph styles in `src/styles/header.css`.
- Update graph runtime interaction and motion behavior in `src/lib/global-graph-modal.ts`.
- Preserve the current graph data model, routes, article reference links, and Swup/Astro navigation integration.

## Visual Design

The left index should become a quieter file-tree sidebar rather than the current slash-heavy text list.

- Use compact row spacing and clear indentation.
- Keep disclosure arrows for expandable sections.
- Remove slash prefix markers from tree rows.
- Show the current item with a slim left active bar, a very soft background, and stronger text weight.
- Keep section child counts, but make them secondary and visually small.
- Keep the monochrome light/dark theme language already used by the site.
- Avoid card-like nesting, colorful accents, gradients, or decorative visual noise.

The right 2D point cloud should have less chrome:

- Remove the root/section/article legend below the canvas.
- Keep the small interaction hint near the panel header.
- Update text so it reflects the intended behavior: drag canvas, drag nodes, click only when intentionally selecting a node.

## Interaction Design

### Click Versus Drag

Point interaction should reduce accidental navigation.

- Pointer down on a node should prepare a possible drag, not immediately feel like a click.
- Navigation should happen only if the pointer is released on the same node after a very small movement.
- The movement threshold should be stricter than the current behavior.
- Once movement passes the threshold, the gesture should be treated as dragging and should never navigate on pointer up.
- Dragging a node should continue to nudge nearby linked or same-cluster nodes, preserving the existing "neighbor pull" feel.
- Canvas panning should remain available when dragging empty canvas space.

### Subtle Autonomous Motion

The point cloud should keep moving slightly on its own after opening.

- Add a low-strength drift force or equivalent per-node velocity nudge.
- Keep root and strongly focused/current nodes stable enough that the graph does not feel jittery.
- Respect the existing cluster anchor force so nodes slowly return toward their intended groups.
- The motion should be visible but restrained, more like breathing than rearranging.
- Continue using the existing requestAnimationFrame simulation loop.

## Responsive Behavior

- Desktop keeps the two-column layout with the file tree on the left and graph on the right.
- Mobile keeps the existing stacked layout.
- Removing the legend should give the point cloud slightly more vertical room.
- Text rows in the sidebar must truncate cleanly and avoid horizontal overflow.

## Accessibility

- Preserve semantic links for all tree entries.
- Preserve `details` and `summary` behavior for expandable sections.
- Current and hover states must remain visible in light and dark themes.
- The graph canvas remains visual; the text tree continues to provide the accessible navigation path.

## Verification

After implementation:

- Run the project test/build command used for Astro changes.
- Open the global graph modal on desktop and mobile widths.
- Verify the left index reads as a compact file sidebar.
- Verify the 2D legend is gone.
- Verify dragging a point does not accidentally navigate.
- Verify a deliberate point click still navigates.
- Verify points continue subtle motion without drifting out of view.
- Verify light and dark themes remain readable.

## Out Of Scope

- Adding search, filters, or new controls inside the modal.
- Changing graph data generation or article reference extraction.
- Replacing the 2D graph library.
- Redesigning the site header button that opens the modal.
