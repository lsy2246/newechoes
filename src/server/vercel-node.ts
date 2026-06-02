import { dispatchFunctionRequest } from "./function-dispatch";

function getRequestOrigin(req: {
  headers?: Record<string, string | string[] | undefined>;
}) {
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  const forwardedHost = req.headers?.["x-forwarded-host"];
  const host = forwardedHost || req.headers?.host || "localhost";
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0] || "https";

  return `${protocol}://${Array.isArray(host) ? host[0] : host}`;
}

function toHeaders(
  input: Record<string, string | string[] | undefined> = {},
) {
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

async function toWebRequest(req: {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}) {
  const method = (req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", getRequestOrigin(req));
  const headers = toHeaders(req.headers);
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = req as unknown as BodyInit;
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function sendWebResponse(
  res: {
    statusCode?: number;
    setHeader(name: string, value: string | string[]): void;
    end(body?: Uint8Array | Buffer | string): void;
  },
  response: Response,
) {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

export async function handleVercelNodeRequest(
  req: {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    statusCode?: number;
    setHeader(name: string, value: string | string[]): void;
    end(body?: Uint8Array | Buffer | string): void;
  },
  handlers: Parameters<typeof dispatchFunctionRequest>[2],
) {
  const request = await toWebRequest(req);
  const response = await dispatchFunctionRequest("vercel", request, handlers);
  await sendWebResponse(res, response);
}
