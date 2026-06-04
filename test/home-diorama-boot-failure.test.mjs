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
    dispatch(type, event = {}) {
      for (const handler of listeners.get(type) ?? []) handler(event);
    },
  };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
};

test("home diorama boot reports module import failures instead of leaving an unhandled rejection", async () => {
  const windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  const homeScene = new FakeElement();
  const loadingDetail = { textContent: "正在准备 3D 模型与字体..." };
  const loading = {
    hidden: false,
    classList: {
      added: new Set(),
      add(value) {
        this.added.add(value);
      },
      contains(value) {
        return this.added.has(value);
      },
    },
    setAttribute(name, value) {
      this[name] = value;
    },
  };

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
      if (selector === "[data-home-scene]") return homeScene;
      if (selector === "[data-home-loading]") return loading;
      if (selector === "[data-home-loading-detail]") return loadingDetail;
      return null;
    },
  };

  const unhandledRejections = [];
  const handleUnhandledRejection = (error) => {
    unhandledRejections.push(error);
  };
  process.on("unhandledRejection", handleUnhandledRejection);

  const cleanup = mountHomeDioramaBoot({
    window,
    document,
    importDiorama: () => Promise.reject(new Error("optimize dep fetch failed")),
  });

  await flushMicrotasks();
  cleanup();
  process.removeListener("unhandledRejection", handleUnhandledRejection);

  assert.equal(unhandledRejections.length, 0);
  assert.equal(
    loadingDetail.textContent,
    "首页场景加载失败，请刷新页面重试。",
  );
  assert.equal(loading["data-home-loading-state"], "error");
});
