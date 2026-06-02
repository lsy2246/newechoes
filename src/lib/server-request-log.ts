import { getDeployTarget } from "@/platform/runtime/index.js";

type RequestLogLevel = "info" | "warn" | "error";
type RequestLogDetails = Record<string, unknown>;

type SerializedError = {
  name: string;
  message: string;
  stack?: string[];
};

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 6).map((line) => line.trim()),
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

function sanitizeDetails(details: RequestLogDetails = {}) {
  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined),
  );
}

function summarizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return value.slice(0, 200);
  }
}

function writeLog(level: RequestLogLevel, payload: RequestLogDetails) {
  const line = `[server-runtime] ${JSON.stringify(payload)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

/**
 * Creates a structured request logger for SSR/API runtimes.
 *
 * Args:
 *   scope: Logical scope name, for example "api.douban".
 *   request: Current request object.
 *   initialDetails: Safe metadata to attach to the start log.
 *
 * Returns:
 *   Logger methods that emit JSON lines with a stable requestId.
 */
export function createServerRequestLog(
  scope: string,
  request: Request,
  initialDetails: RequestLogDetails = {},
) {
  const startedAt = Date.now();
  const requestUrl = new URL(request.url);
  const requestId = createRequestId();
  const basePayload = {
    scope,
    requestId,
    method: request.method,
    pathname: requestUrl.pathname,
    deployTarget: getDeployTarget(),
  };

  const log = (level: RequestLogLevel, event: string, details: RequestLogDetails = {}) => {
    writeLog(level, {
      ...basePayload,
      event,
      durationMs: Date.now() - startedAt,
      ...sanitizeDetails(details),
    });
  };

  log("info", "request.start", initialDetails);

  return {
    requestId,
    info(event: string, details: RequestLogDetails = {}) {
      log("info", event, details);
    },
    warn(event: string, details: RequestLogDetails = {}) {
      log("warn", event, details);
    },
    error(event: string, error: unknown, details: RequestLogDetails = {}) {
      log("error", event, {
        ...details,
        error: serializeError(error),
      });
    },
    respond(status: number, details: RequestLogDetails = {}) {
      log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "request.complete", {
        status,
        ...details,
      });
    },
  };
}

export { summarizeUrl };
