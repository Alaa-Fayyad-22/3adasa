import type { IncomingMessage, ServerResponse } from "node:http";

// Minimal local stand-ins for @vercel/node's VercelRequest/VercelResponse.
// Hand-rolled instead of depending on @vercel/node directly: that package
// pulls in a large, vulnerability-laden dev-tooling tree (Python runtime
// analysis, an old undici, etc.) just to get these two shapes. Vercel's
// actual runtime injects `query`/`body`/`cookies` onto the request and
// `status`/`json`/`send` onto the response the same way regardless of
// whether this package is installed — this just describes that shape.

export type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
};

export type VercelResponse = ServerResponse & {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  send(body: unknown): VercelResponse;
};
