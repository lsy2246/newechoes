import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as homeDioramaBoot from "../src/components/home/homeDioramaBoot.js";

const layoutSource = readFileSync("src/components/Layout.astro", "utf8");

const createEventTarget = () => {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      const items = listeners.get(type) ?? [];
      items.push(handler);
      listeners.set(type, items);
    },
    removeEventListener(type, handler) {
      const items = listeners.get(type) ?? [];
      listeners.set(
        type,
        items.filter((item) => item !== handler),
      );
    },
    dispatchEvent(event) {
      for (const handler of listeners.get(event.type) ?? []) handler(event);
    },
  };
};

test("layout installs a persistent home diorama lifecycle bridge", () => {
  assert.doesNotMatch(layoutSource, /installHomeDioramaRehydrationBridge/);
});

test("home diorama lifecycle bridge remounts boot when returning home after the first visit", () => {
  assert.equal(typeof homeDioramaBoot.installHomeDioramaRehydrationBridge, "function");

  const windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  const homeScene = {};
  let homeSceneAttached = false;
  let mountCalls = 0;

  const window = {
    ...windowTarget,
    location: { pathname: "/" },
    setTimeout(handler) {
      handler();
      return 1;
    },
    clearTimeout() {},
  };

  const document = {
    ...documentTarget,
    readyState: "complete",
    querySelector(selector) {
      if (selector === "[data-home-scene]") return homeSceneAttached ? homeScene : null;
      return null;
    },
  };

  const install = homeDioramaBoot.installHomeDioramaRehydrationBridge({
    window,
    document,
    mountBoot({ window: targetWindow }) {
      mountCalls += 1;
      targetWindow.__homeDioramaBootCleanup = () => {};
    },
  });

  assert.equal(typeof install, "function");
  assert.equal(mountCalls, 0);

  homeSceneAttached = true;
  document.dispatchEvent({ type: "astro:page-load" });
  assert.equal(mountCalls, 1);

  window.location.pathname = "/albums";
  delete window.__homeDioramaBootCleanup;
  document.dispatchEvent({ type: "astro:page-load" });
  assert.equal(mountCalls, 1);

  window.location.pathname = "/";
  document.dispatchEvent({ type: "astro:page-load" });
  assert.equal(mountCalls, 2);
});
