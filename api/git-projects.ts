import { handleVercelNodeRequest } from "../src/server/vercel-node";
import {
  GET as handleGet,
  OPTIONS as handleOptions,
} from "../src/server/api/git-projects";

const handlers = {
  GET: handleGet,
  OPTIONS: handleOptions,
};

export default function handler(req: unknown, res: unknown) {
  return handleVercelNodeRequest(
    req as Parameters<typeof handleVercelNodeRequest>[0],
    res as Parameters<typeof handleVercelNodeRequest>[1],
    handlers,
  );
}
