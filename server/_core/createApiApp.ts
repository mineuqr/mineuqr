import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handlePayPalWebhook } from "../paypal-webhook";
import { handleTapWebhook } from "../tap-webhook";
import { localAuthRouter } from "../auth-local";
import { validateAuthSecurityConfig, shouldTrustProxy } from "./authSecurity";
import { validateDeploymentAuthReadiness } from "./deploymentReadiness";
import { customerPushRouter } from "../customerPush/routes";
import { realtimeHttpRouter } from "../realtime-platform/http/realtimeHttpRouter";
import { registerConnectorProductHttpRoutes } from "./connectorProductRoutes";
import { validateCustomerPushAtStartup } from "../customerPush/vapid";
import {
  schedulePlatformProtectionHealthProbe,
  validatePlatformProtectionAtStartup,
} from "../platformProtectionHealth";
import { correlationMiddleware } from "./requestContext";
import { deploymentGuardsMiddleware } from "./deploymentGuards";
import {
  ensureUploadsDir,
  UPLOADS_DIR,
  useLocalUploads,
} from "../local-uploads";
/** Express app with API routes only (no Vite dev server, no static SPA). Used by Vercel serverless. */
export async function createApiApp(): Promise<Express> {
  validateAuthSecurityConfig();
  validateDeploymentAuthReadiness();
  validatePlatformProtectionAtStartup();
  validateCustomerPushAtStartup();
  schedulePlatformProtectionHealthProbe();

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

  app.post("/api/paypal/webhook", handlePayPalWebhook);
  registerConnectorProductHttpRoutes(app);
  app.use("/api/push", customerPushRouter);
  app.use("/api/realtime", realtimeHttpRouter);
  app.use(localAuthRouter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
