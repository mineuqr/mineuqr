/**
 * Vercel serverless entry (bundled to api/server.mjs at build time).
 * Do not import from ../server/* here — use esbuild bundle so /var/task has one file.
 */
import type { Express } from "express";
import { createApp } from "../server/_core/createApp";

let appPromise: Promise<Express> | undefined;

async function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

/** Vercel serverless handler — API routes only (static SPA is served from dist/public). */
export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
