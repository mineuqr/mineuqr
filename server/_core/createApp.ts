import express, { type Express } from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handlePayPalWebhook } from "../paypal-webhook";
import { handleTapWebhook } from "../tap-webhook";
import { localAuthRouter } from "../auth-local";
import { validateAuthSecurityConfig, shouldTrustProxy } from "./authSecurity";
import { validateDeploymentAuthReadiness } from "./deploymentReadiness";
import { correlationMiddleware } from "./requestContext";
import { deploymentGuardsMiddleware } from "./deploymentGuards";
import {
  ensureUploadsDir,
  UPLOADS_DIR,
  useLocalUploads,
} from "../local-uploads";

/**
 * Builds the Express application (routes + static/Vite).
 * Used by local `node dist/index.js` and Vercel `api/server.ts`.
 */
export async function createApp(): Promise<Express> {
  validateAuthSecurityConfig();
  validateDeploymentAuthReadiness();

  const app = express();

  if (shouldTrustProxy()) {
    app.set("trust proxy", 1);
  }

  app.use(correlationMiddleware);
  app.use(deploymentGuardsMiddleware);

  app.post("/api/tap/webhook", express.json(), handleTapWebhook);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  if (useLocalUploads()) {
    await ensureUploadsDir();
    app.use("/uploads", express.static(UPLOADS_DIR));
  }

  registerOAuthRoutes(app);
  app.post("/api/paypal/webhook", handlePayPalWebhook);
  app.use(localAuthRouter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    const server = createServer(app);
    await setupVite(app, server);
  } else if (!process.env.VERCEL) {
    // Vercel serves dist/public from the CDN; API traffic hits api/server only.
    serveStatic(app);
  }

  return app;
}
