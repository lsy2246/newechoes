import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const consts = readFileSync("src/consts.ts", "utf8");
const diorama = readFileSync("src/components/home/diorama.ts", "utf8");

test("home diorama copy is hardcoded near the home implementation", () => {
  assert.equal(consts.includes("HOME_PROFILE"), false);
  assert.equal(diorama.includes('import { HOME_PROFILE } from "@/consts";'), false);
  assert.ok(diorama.includes("const HOME_TYPEWRITER_LINES"));
  assert.ok(diorama.includes("const HOME_PROFILE_ROWS"));
  assert.ok(diorama.includes('"today in echoes"'));
});
