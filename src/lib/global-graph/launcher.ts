type GlobalGraphModalController = {
  open: () => Promise<void>;
  close: () => void;
};

let controllerPromise: Promise<GlobalGraphModalController | null> | null = null;

async function ensureGlobalGraphController() {
  if (!controllerPromise) {
    controllerPromise = (async () => {
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
