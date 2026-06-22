/**
 * THERMAL-PRINTING-12E.1B — production Agent Host entrypoint.
 *
 * Usage:
 *   pnpm build:print-host && pnpm start:print-host
 *   PRINT_HOST_PORT=8080 node dist/print-host.mjs
 */
import "dotenv/config";
import { createServer } from "node:http";
import { attachPrintAgentWebSocketServer } from "../printing/printAgentWebSocketServer";
import { PRINT_AGENT_WEBSOCKET_PATH } from "../printing/printAgentWebSocketServer";
import { createPrintHostApp } from "./createPrintHostApp";
import { PRINT_HOST_ENV } from "./printHostEnv";

async function startPrintHost(): Promise<void> {
  const app = await createPrintHostApp();
  const server = createServer(app);

  attachPrintAgentWebSocketServer(server);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PRINT_HOST_ENV.port, () => resolve());
  });

  const publicBase = PRINT_HOST_ENV.publicUrl || `http://127.0.0.1:${PRINT_HOST_ENV.port}`;
  console.log(`[PrintHost] Listening on port ${PRINT_HOST_ENV.port}`);
  console.log(`[PrintHost] Health: ${publicBase}/health`);
  console.log(`[PrintHost] tRPC: ${publicBase}/api/trpc`);
  console.log(`[PrintHost] WebSocket: ${publicBase.replace(/^http/, "ws")}${PRINT_AGENT_WEBSOCKET_PATH}`);
}

startPrintHost().catch((error) => {
  console.error("[PrintHost] Startup failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
