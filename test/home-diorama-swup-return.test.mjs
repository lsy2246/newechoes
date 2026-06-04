import assert from "node:assert/strict";
import test from "node:test";

import { mountHomeDioramaBoot } from "../src/components/home/homeDioramaBoot.js";

class FakeElement {}

globalThis.Element = FakeElement;

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

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
};

test("home diorama retries boot on page lifecycle events when the home scene is attached after mount", async () => {
  const windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  const homeScene = new FakeElement();
  let sceneAttached = false;
  let initCalls = 0;
  let timeoutId = 0;

  const window = {
    ...windowTarget,
    location: { pathname: "/" },
    setTimeout(handler) {
      timeoutId += 1;
      handler();
      return timeoutId;
    },
    clearTimeout() {},
  };

  const document = {
    ...documentTarget,
    readyState: "complete",
    querySelector(selector) {
      if (selector === "[data-home-scene]") return sceneAttached ? homeScene : null;
      if (selector === "[data-home-loading]") return null;
      if (selector === "[data-home-loading-detail]") return null;
      return null;
    },
  };

  mountHomeDioramaBoot({
    window,
    document,
    importDiorama: async () => ({
      initDiorama() {
        initCalls += 1;
      },
    }),
  });

  await flushMicrotasks();
  assert.equal(initCalls, 0);

  sceneAttached = true;
  document.dispatchEvent({ type: "astro:page-load" });
  await flushMicrotasks();

  assert.equal(initCalls, 1);
});
