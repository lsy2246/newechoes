export function createEdgeoneCompatPlugin(deployTarget) {
  const virtualId = "\0edgeone-server-entrypoint-shim";

  return {
    name: "edgeone-server-entrypoint-compat",
    resolveId(source) {
      if (
        deployTarget === "edgeone" &&
        /@edgeone[\/\\]astro[\/\\]dist[\/\\]server\.js$/.test(source)
      ) {
        return virtualId;
      }

      return null;
    },
    load(id) {
      if (id !== virtualId) {
        return null;
      }

      return `
export { createExports } from "@edgeone/astro/server";
const edgeoneServerEntrypointShim = {};
export default edgeoneServerEntrypointShim;
`;
    },
  };
}
