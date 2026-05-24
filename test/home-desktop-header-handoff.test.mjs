import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeStory = readFileSync("src/components/home/homeScreenStory.ts", "utf8");
const desktopStory = homeStory.match(/const drawDesktopStory =[\s\S]*?export const drawHomeScreenStory/)?.[0] ?? "";

test("desktop story preserves stage headers while reducing transition overlap", () => {
  assert.ok(desktopStory.includes("stageHeader(\"input / things I keep returning to\""));
  assert.ok(desktopStory.includes("stageHeader(\"classify / three inner lanes\""));
  assert.ok(desktopStory.includes("stageHeader(\"work / systems I shaped\""));

  assert.ok(desktopStory.includes("const inputHeaderReadability = 1 - phase(progress, 0.34, 0.4);"));
  assert.ok(desktopStory.includes("const classifyHeaderReadability = 1 - phase(progress, 0.6, 0.66);"));
  assert.ok(desktopStory.includes("const workHeaderReadability = phase(progress, 0.62, 0.7) * workSceneAlpha;"));

  assert.ok(desktopStory.includes("const inputHeaderAlpha = phase(progress, 0.12, 0.22) * inputHeaderReadability;"));
  assert.ok(desktopStory.includes("const classifyAlpha = phase(progress, 0.38, 0.48) * classifyHeaderReadability;"));
  assert.ok(desktopStory.includes("const workHeaderAlpha = workHeaderReadability;"));

  assert.equal(desktopStory.includes("drawDesktopTransitionCue"), false);
  assert.equal(desktopStory.includes("drawInputKeywordCue"), false);
});
