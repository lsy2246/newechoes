import { setRuntimeDeployTarget } from "../platform/shared/target.js";

type RequestContext = {
  request: Request;
};

type RequestHandler = (context: RequestContext) => Response | Promise<Response>;
type OptionsHandler = () => Response | Promise<Response>;

type RouteHandlers = Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD", RequestHandler>> & {
  OPTIONS?: OptionsHandler;
  ALL?: RequestHandler;
};

function buildAllowHeader(handlers: RouteHandlers) {
  const allowed = Object.entries(handlers)
    .filter(([, handler]) => typeof handler === "function")
    .map(([method]) => method)
    .filter((method) => method !== "ALL");

  if (handlers.ALL && !allowed.includes("OPTIONS")) {
    allowed.push("OPTIONS");
  }

  return allowed.sort().join(", ");
}

export async function dispatchFunctionRequest(
  target: "vercel" | "edgeone" | "cloudflare",
  request: Request,
  handlers: RouteHandlers,
) {
  setRuntimeDeployTarget(target);

  const method = request.method.toUpperCase();

  if (method === "OPTIONS" && handlers.OPTIONS) {
    return handlers.OPTIONS();
  }

  const handler =
    (handlers as Partial<Record<string, RequestHandler>>)[method]
    || handlers.ALL;

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
