import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const consts = readFileSync("src/consts.ts", "utf8");
const diorama = readFileSync("src/components/home/diorama.ts", "utf8");
const homeDiorama = readFileSync("src/components/home/HomeDiorama.astro", "utf8");
const indexPage = readFileSync("src/pages/index.astro", "utf8");

test("home page copy is passed at the home component call site", () => {
  assert.equal(consts.includes("export const HOME_PROFILE"), false);
  assert.equal(diorama.includes('from "@/consts"'), false);
  assert.ok(homeDiorama.includes("profile: HomeProfile"));
  assert.ok(homeDiorama.includes("window.__HOME_PROFILE = profile"));
  assert.equal(diorama.includes("const HOME_TYPEWRITER_LINES"), false);
  assert.equal(diorama.includes("const HOME_PROFILE_ROWS"), false);
  assert.equal(diorama.includes("lsy22@vip.qq.com"), false);
  assert.equal(indexPage.includes("lsy |"), false);
  assert.ok(indexPage.includes("const homeProfile"));
  assert.ok(indexPage.includes("profile={homeProfile}"));
});
