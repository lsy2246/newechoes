import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home keyboard GLB only lets the larger chassis meshes cast shadows", () => {
  assert.match(dioramaTs, /const KEYBOARD_MODEL_SHADOW_TRIANGLE_THRESHOLD = 400;/);
  assert.match(dioramaTs, /const shouldKeyboardModelMeshCastShadow = \(mesh: THREE\.Mesh\) => \{/);
  assert.match(dioramaTs, /const positionAttr = mesh\.geometry\.getAttribute\("position"\);/);
  assert.match(
    dioramaTs,
    /const triangleCount = mesh\.geometry\.index \? mesh\.geometry\.index\.count \/ 3 : positionAttr\.count \/ 3;/,
  );
  assert.match(dioramaTs, /return triangleCount >= KEYBOARD_MODEL_SHADOW_TRIANGLE_THRESHOLD;/);
  assert.match(dioramaTs, /mesh\.castShadow = shouldKeyboardModelMeshCastShadow\(mesh\);/);
  assert.match(dioramaTs, /mesh\.receiveShadow = true;/);
});
