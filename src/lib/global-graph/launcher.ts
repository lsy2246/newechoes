type GlobalGraphModalController = {
  open: () => Promise<void>;
  close: () => void;
};

const GLOBAL_GRAPH_FRAGMENT_PATH = "/global-graph-modal-fragment";

let controllerPromise: Promise<GlobalGraphModalController | null> | null = null;

async function ensureGraphModalMarkup() {
  const root = document.querySelector("[data-global-graph-root]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Global graph root not found");
  }

  if (root.querySelector("#global-graph-modal")) {
    return root;
  }

  const response = await fetch(GLOBAL_GRAPH_FRAGMENT_PATH, {
    credentials: "same-origin",
    headers: {
      "X-Requested-With": "global-graph-launcher",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch global graph fragment: ${response.status}`);
  }

  root.innerHTML = await response.text();
  return root;
}

async function ensureGlobalGraphController() {
  if (!controllerPromise) {
    controllerPromise = (async () => {
      await ensureGraphModalMarkup();
      const { initGlobalGraphModal } = await import("@/lib/global-graph/modal");
      return initGlobalGraphModal();
    })().catch((error) => {
      controllerPromise = null;
      throw error;
    });
  }

  return controllerPromise;
}

export async function openGlobalGraph() {
  const controller = await ensureGlobalGraphController();
  await controller?.open();
}

export async function closeGlobalGraph() {
  const controller = await ensureGlobalGraphController();
  controller?.close();
}
