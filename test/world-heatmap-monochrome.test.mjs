import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worldHeatmap = readFileSync("src/components/WorldHeatmap.tsx", "utf8");

test("world heatmap globe uses clean visible light linework with a blue hover focus", () => {
  assert.ok(worldHeatmap.includes("WORLD_HEATMAP_LIGHT_COLORS"));
  assert.ok(worldHeatmap.includes("WORLD_HEATMAP_DARK_COLORS"));
  assert.ok(worldHeatmap.includes('earthBase: "#f1f7f8"'));
  assert.ok(worldHeatmap.includes("earthOpacity: 0.72"));
  assert.ok(worldHeatmap.includes('unvisitedBorder: "#8fa0aa"'));
  assert.ok(worldHeatmap.includes('chinaBorder: "#5f6f78"'));
  assert.ok(worldHeatmap.includes('hover: "#2563eb"'));
  assert.ok(worldHeatmap.includes('hover: "#93c5fd"'));

  for (const staleColor of [
    "#2a4d69",
    "#34d399",
    "#065f46",
    "#10b981",
    "#0d9488",
    "#f87171",
    "#ef4444",
    "#60a5fa",
    "#fcd34d",
    "#b8872b",
    "#d8c35f",
    "#f2f2f0",
    "#f7f7f4",
    "#b7b7b1",
    "#5f7284",
    "#0f766e",
    "#7dd3c7",
    "#7c3aed",
    "#c4b5fd",
    'earthOpacity: 0.34',
    'earthOpacity: 0.58',
  ]) {
    assert.equal(
      worldHeatmap.includes(staleColor),
      false,
      `${staleColor} should not remain in the globe palette`,
    );
  }
});

test("world heatmap hover badge uses semantic classes instead of old colored pills", () => {
  assert.ok(worldHeatmap.includes("world-heatmap-hover-card"));
  assert.ok(worldHeatmap.includes("world-heatmap-status-pill"));
  assert.ok(worldHeatmap.includes('data-visited="true"'));

  for (const staleClass of [
    "bg-emerald-100",
    "dark:bg-emerald-900/60",
    "text-emerald-600",
    "dark:text-emerald-400",
    "bg-gray-100",
    "dark:bg-gray-700/60",
    "hover:scale-105",
    "rounded-xl",
    "shadow-lg",
  ]) {
    assert.equal(
      worldHeatmap.includes(staleClass),
      false,
      `${staleClass} should not style the hover badge`,
    );
  }
});

test("world heatmap theme changes update materials without rebuilding the camera scene", () => {
  assert.equal(
    worldHeatmap.includes("}, [visitedPlaces, theme, wasmReady, geoProcessor]);"),
    false,
    "theme changes should not rerun the main Three.js initialization effect",
  );
  assert.ok(
    worldHeatmap.includes(
      "}, [visitedPlaces, wasmReady, geoProcessor]);",
    ),
  );
  assert.ok(worldHeatmap.includes("applyThemeToScene"));
  assert.ok(worldHeatmap.includes("line.userData.hoverColor = colors.hover"));
});

test("world heatmap keeps auto-rotation smooth during page scrolling without changing zoom controls", () => {
  assert.equal(worldHeatmap.includes("controls.enableZoom = false;"), false);
  assert.equal(worldHeatmap.includes("handleWheelZoomMode"), false);
  assert.equal(worldHeatmap.includes("event.ctrlKey || event.metaKey"), false);
  assert.equal(worldHeatmap.includes("handleWheelKeepAutoRotate"), false);
  assert.equal(worldHeatmap.includes("requestIdleCallback"), false);
  assert.equal(worldHeatmap.includes("scheduleNextFrame"), false);
  assert.ok(worldHeatmap.includes("controls.autoRotate = true;"));
  assert.ok(
    /sceneRef\.current\.animationId\s*=\s*requestAnimationFrame\(animate\)/.test(
      worldHeatmap,
    ),
  );
});
