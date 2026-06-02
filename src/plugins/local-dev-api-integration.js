import path from "node:path";
import { getDeployTarget, setRuntimeDeployTarget } from "../platform/shared/target.js";

export const DEV_API_ROUTE_MODULES = {
  "/api/douban": "/src/server/api/douban.ts",
  "/api/weread": "/src/server/api/weread.ts",
  "/api/git-projects": "/src/server/api/git-projects.ts",
  "/api/google-photos": "/src/server/api/google-photos.ts",
};

function toHeaders(input = {}) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  return headers;
}

async function readNodeRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

async function toWebRequest(req) {
  const method = (req.method || "GET").toUpperCase();
  const origin = `http://${req.headers.host || "127.0.0.1"}`;
  const requestUrl = new URL(req.url || "/", origin);
  const headers = toHeaders(req.headers);
  const init = {
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await readNodeRequestBody(req);
    if (body) {
      init.body = body;
      init.duplex = "half";
    }
  }

  return new Request(requestUrl, init);
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

function pickHandlers(routeModule) {
  const handlers = {};

  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "ALL"]) {
    if (typeof routeModule[method] === "function") {
      handlers[method] = routeModule[method];
    }
  }

  return handlers;
}

function buildAllowHeader(handlers) {
  const allowed = Object.entries(handlers)
    .filter(([, handler]) => typeof handler === "function")
    .map(([method]) => method)
    .filter((method) => method !== "ALL");

  if (handlers.ALL && !allowed.includes("OPTIONS")) {
    allowed.push("OPTIONS");
  }

  return allowed.sort().join(", ");
}

async function dispatchLocalDevRequest(target, request, handlers) {
  setRuntimeDeployTarget(target);

  const method = request.method.toUpperCase();

  if (method === "OPTIONS" && handlers.OPTIONS) {
    return handlers.OPTIONS();
  }

  const handler = handlers[method] || handlers.ALL;

  if (handler) {
    return handler({ request });
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      Allow: buildAllowHeader(handlers),
    },
  });
}

export function localDevApiIntegration() {
  return {
    name: "local-dev-api-integration",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const routeModules = new Map();
        let preloadPromise = null;

        const loadRouteModules = async () => {
          const entries = await Promise.all(
            Object.entries(DEV_API_ROUTE_MODULES).map(async ([pathname, modulePath]) => {
              const routeModule = await server.ssrLoadModule(modulePath);
              return [pathname, routeModule];
            }),
          );

          routeModules.clear();
          for (const [pathname, routeModule] of entries) {
            routeModules.set(pathname, routeModule);
          }
        };

        preloadPromise = loadRouteModules();

        server.watcher.on("change", (changedFile) => {
          if (
            changedFile.includes(`${path.sep}src${path.sep}server${path.sep}`)
            || changedFile.includes(`${path.sep}src${path.sep}lib${path.sep}`)
            || changedFile.includes(`${path.sep}src${path.sep}platform${path.sep}`)
          ) {
            preloadPromise = loadRouteModules().catch(() => null);
          }
        });

        server.middlewares.use(async (req, res, next) => {
          const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
          const routeModulePath = DEV_API_ROUTE_MODULES[pathname];

          if (!routeModulePath) {
            next();
            return;
          }

          try {
            await preloadPromise;
            const routeModule = routeModules.get(pathname);

            if (!routeModule) {
              throw new Error(`本地开发接口模块未加载: ${routeModulePath}`);
            }

            const handlers = pickHandlers(routeModule);
            const target = getDeployTarget(process.env);
            const request = await toWebRequest(req);
            const response = await dispatchLocalDevRequest(target, request, handlers);
            await sendWebResponse(res, response);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({
              error: "本地开发接口桥接失败",
              message: error instanceof Error ? error.message : String(error),
            }));
          }
        });
      },
    },
  };
}
