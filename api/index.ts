/**
 * Vercel serverless entry (always deployed). App logic is bundled to dist/vercel-api.mjs at build time.
 * Types resolve via package.json imports → scripts/vercel-handler.ts; runtime → dist/vercel-api.mjs.
 */
import type vercelApiHandler from "#vercel-api";

type VercelApiHandler = typeof vercelApiHandler;

let handlerPromise: Promise<VercelApiHandler> | undefined;

export default async function handler(
  req: Parameters<VercelApiHandler>[0],
  res: Parameters<VercelApiHandler>[1]
) {
  if (!handlerPromise) {
    const mod = await import("#vercel-api");
    handlerPromise = Promise.resolve(mod.default);
  }
  const fn = await handlerPromise;
  return fn(req, res);
}
