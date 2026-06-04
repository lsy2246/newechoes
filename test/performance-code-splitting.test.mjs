import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroConfig = readFileSync("astro.config.mjs", "utf8");
const aboutPage = readFileSync("src/pages/about.astro", "utf8");
const homeDiorama = readFileSync("src/components/home/HomeDiorama.astro", "utf8");

test("three dependencies are split into smaller core and addon chunks", () => {
  assert.ok(astroConfig.includes('id.includes("node_modules/three/examples/")'));
  assert.ok(astroConfig.includes('return "vendor-three-addons"'));
  assert.ok(astroConfig.includes('id.includes("node_modules/three/")'));
  assert.ok(astroConfig.includes('return "vendor-three-core"'));
  assert.equal(astroConfig.includes('return "vendor-three";'), false);
});

test("about page delays the heavy world heatmap island until it is visible", () => {
  assert.ok(aboutPage.includes("client:visible"));
  assert.equal(aboutPage.includes('client:only="react"'), false);
});

test("home diorama loads its three scene module asynchronously and guards swup navigation", () => {
  assert.ok(homeDiorama.includes('import("./diorama")'));
  assert.ok(homeDiorama.includes("HOME_DIORAMA_MODULE_KEY"));
  assert.ok(homeDiorama.includes("HOME_DIORAMA_ACTIVE_SCENE_KEY"));
  assert.ok(homeDiorama.includes("HOME_DIORAMA_BOOT_TOKEN_KEY"));
  assert.ok(homeDiorama.includes("requestAnimationFrame(() => {"));
  assert.ok(homeDiorama.includes('window.requestIdleCallback(resolve, { timeout: 600 })'));
  assert.ok(homeDiorama.includes("window[HOME_DIORAMA_MODULE_KEY]"));
  assert.ok(homeDiorama.includes("window[HOME_DIORAMA_ACTIVE_SCENE_KEY]"));
  assert.ok(homeDiorama.includes("window[HOME_DIORAMA_BOOT_TOKEN_KEY]"));
  assert.ok(homeDiorama.includes("if (window[HOME_DIORAMA_ACTIVE_SCENE_KEY] === sceneElement) return"));
  assert.ok(homeDiorama.includes('document.querySelector("[data-home-scene]")'));
  assert.ok(homeDiorama.includes('document.querySelector("[data-home-scene]") !== sceneElement'));
  assert.ok(homeDiorama.includes('document.addEventListener("astro:before-swap", resetDioramaState)'));
  assert.ok(homeDiorama.includes('document.addEventListener("swup:visit:start", resetDioramaState)'));
  assert.equal(homeDiorama.includes('import { initDiorama } from "./diorama";'), false);
});
