/**
 * THERMAL-PRINTING-12E.1B — dedicated print runtime Express app (Agent Host).
 *
 * Hosts WebSocket upgrades on the bound HTTP server and exposes read-only
 * printing operations tRPC against the in-memory agent registry.
 */
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "../_core/context";
import { validateAuthSecurityConfig, shouldTrustProxy } from "../_core/authSecurity";
import { validateDeploymentAuthReadiness } from "../_core/deploymentReadiness";
import { correlationMiddleware } from "../_core/requestContext";
import { initializePrintingRuntime } from "../printing/printingRuntimeBootstrap";
import { listAgentConnectivityStates } from "../printing/agentLifecycleService";
import { listAgents } from "../printing/agentRegistry";
import { listEndpointOperations } from "../printing/endpointOperationsService";
import { PRINT_HOST_ENV } from "./printHostEnv";
import { printHostRouter } from "./printHostRouter";

export async function createPrintHostApp(): Promise<Express> {
  validateAuthSecurityConfig();
  validateDeploymentAuthReadiness();
  await initializePrintingRuntime();

  const app = express();

  if (shouldTrustProxy()) {
    app.set("trust proxy", 1);
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (typeof origin === "string" && PRINT_HOST_ENV.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "content-type,x-correlation-id,trpc-batch-mode"
      );
      res.status(204).end();
      return;
    }

    next();
  });

  app.use(correlationMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    const agents = listAgents();
    const connectivity = listAgentConnectivityStates();
    const onlineAgents = connectivity.filter((entry) => entry.status === "online").length;
    const endpoints = listEndpointOperations();

    res.json({
      status: "ok",
      service: "mineuqr-print-host",
      agents: {
        registered: agents.length,
        online: onlineAgents,
      },
      endpoints: {
        total: endpoints.length,
        online: endpoints.filter((entry) => entry.connectivityState === "ONLINE").length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: printHostRouter,
      createContext,
    })
  );

  return app;
}
