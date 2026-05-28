/**
 * Vercel serverless entry (always deployed). App logic is bundled to dist/vercel-api.mjs at build time.
 * @see scripts/vercel-handler.ts
 */
let handlerPromise: Promise<(req: any, res: any) => Promise<unknown>> | undefined;

export default async function handler(req: any, res: any) {
  if (!handlerPromise) {
    handlerPromise = import("../dist/vercel-api.mjs").then((mod) => mod.default);
  }
  const fn = await handlerPromise;
  return fn(req, res);
}
