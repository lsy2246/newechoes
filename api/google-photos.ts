import { handleVercelNodeRequest } from "../src/server/vercel-node";
import { GET as handleGet } from "../src/server/api/google-photos";

const handlers = { GET: handleGet };

export default function handler(req: unknown, res: unknown) {
  return handleVercelNodeRequest(
    req as Parameters<typeof handleVercelNodeRequest>[0],
    res as Parameters<typeof handleVercelNodeRequest>[1],
    handlers,
  );
}
