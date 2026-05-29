import { createServer } from "http";
import type { Express } from "express";
import { createApiApp } from "./createApiApp";
import { serveStatic } from "./static";

/**
 * Builds the Express application (API + optional Vite dev / static SPA).
 * Used by local `node dist/index.js`. Vercel uses createApp.production.ts instead.
 */
export async function createApp(): Promise<Express> {
  const app = await createApiApp();

  if (process.env.NODE_ENV === "development") {
    const server = createServer(app);
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else if (!process.env.VERCEL) {
    serveStatic(app);
  }

  return app;
}
