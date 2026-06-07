import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home typing character GLB only lets the larger silhouette meshes cast shadows", () => {
  assert.match(dioramaTs, /const TYPING_CHARACTER_SHADOW_TRIANGLE_THRESHOLD = 1800;/);
  assert.match(dioramaTs, /const shouldTypingCharacterMeshCastShadow = \(mesh: THREE\.Mesh\) => \{/);
  assert.match(dioramaTs, /const positionAttr = mesh\.geometry\.getAttribute\("position"\);/);
  assert.match(
    dioramaTs,
    /const triangleCount = mesh\.geometry\.index \? mesh\.geometry\.index\.count \/ 3 : positionAttr\.count \/ 3;/,
  );
  assert.match(dioramaTs, /return triangleCount >= TYPING_CHARACTER_SHADOW_TRIANGLE_THRESHOLD;/);
  assert.match(dioramaTs, /mesh\.castShadow = shouldTypingCharacterMeshCastShadow\(mesh\);/);
  assert.match(dioramaTs, /mesh\.receiveShadow = true;/);
});
