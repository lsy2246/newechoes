import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storyTs = readFileSync("src/components/home/homeScreenStory.ts", "utf8");
const desktopStory = storyTs.match(/const drawDesktopStory =[\s\S]*?export const drawHomeScreenStory/)?.[0] ?? "";

test("desktop numbered tags left align the number and title as one group", () => {
  assert.match(desktopStory, /const compactContentW = numberWidth \+ numberGap \+ titleWidth;/);
  assert.match(desktopStory, /const compactNumberX = rect\.x;/);
  assert.match(desktopStory, /const compactTitleX = compactNumberX \+ numberWidth \+ numberGap;/);
  assert.match(desktopStory, /text\(materialNumber, layout\.numberX, layout\.numberY/);
  assert.doesNotMatch(desktopStory, /const compactNumberX = rect\.x \+ /);
});

test("desktop numbered tag slots use the same metrics as their renderer", () => {
  assert.match(desktopStory, /const targetTagSize = 18 \* unit;/);
  assert.match(desktopStory, /const targetNumberSize = 14 \* unit;/);
  assert.match(desktopStory, /targetNumberW \+ 10 \* unit \+ measure\(materials\[itemIndex\]\.title, targetTagSize/);
  assert.match(desktopStory, /const trackPad = 24 \* unit;/);
  assert.match(desktopStory, /const startX = track\.x \+ trackPad;/);
  assert.doesNotMatch(desktopStory, /const startX = track\.x \+ \(track\.w - totalW\) \/ 2;/);
});
