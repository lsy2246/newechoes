import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home theme switches immediately repaint the visible story overlay in non-room phases", () => {
  assert.match(
    dioramaTs,
    /if \(renderMode !== "room"\) \{\s*lastConnectorMotionTick = -1;\s*drawScreen\(\{ overlay: true, texture: false \}\);\s*\}/,
  );
});
