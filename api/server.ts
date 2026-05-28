import type { Express } from "express";
import { createApp } from "../server/_core/createApp";

let appPromise: Promise<Express> | undefined;

async function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

/** Vercel serverless entry — API routes only (static SPA is served from dist/public). */
export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
