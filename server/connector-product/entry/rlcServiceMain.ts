import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { composeConnectorLocal } from "../../connector-local/connectorLocalComposition";
import {
  defaultCloudEndpointFromApiBase,
  FileLocalConnectorConfigProvider,
  isConnectorEnrolled,
} from "../../connector-local/infrastructure/FileLocalConnectorConfigProvider";
import { WebSocketGatewayTransportFactory } from "../../connector-local/infrastructure/WebSocketGatewayTransportFactory";
import { resolveConnectorLogPath } from "../../connector-local/infrastructure/connectorConfigPaths";
import {
  MINEUQR_CONNECTOR_PRODUCT_NAME,
  MINEUQR_CONNECTOR_VERSION,
} from "../../connector-local/infrastructure/productIdentity";
import { LocalConnectorServiceSupervisor } from "../../connector-local/services/LocalConnectorServiceSupervisor";
import { startConnectorLocalStatusServer } from "../../connector-local/infrastructure/ConnectorLocalStatusServer";

process.env.RLC_RUNTIME = process.env.RLC_RUNTIME ?? "1";

async function appendLog(line: string): Promise<void> {
  const path = resolveConnectorLogPath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `[${new Date().toISOString()}] ${line}\n`, "utf8");
}

async function main(): Promise<void> {
  const configProvider = new FileLocalConnectorConfigProvider();
  const enrolled = isConnectorEnrolled();

  if (!enrolled) {
    await appendLog("Connector is not enrolled. Waiting for tray enrollment.");
    await startConnectorLocalStatusServer({
      getSnapshot: () => ({
        productName: MINEUQR_CONNECTOR_PRODUCT_NAME,
        version: MINEUQR_CONNECTOR_VERSION,
        enrolled: false,
        lifecycle: "stopped",
        connectionStatus: "stopped",
        serviceStatus: "running",
        lastError: "enrollment_required",
        reconnectAttempt: 0,
        startedAt: null,
      }),
    });
    return;
  }

  const config = configProvider.load();
  const local = composeConnectorLocal({
    configProvider,
    transportFactory: new WebSocketGatewayTransportFactory(config.cloudEndpoint),
  });

  const supervisor = new LocalConnectorServiceSupervisor({
    bootstrap: local.bootstrap,
    productName: MINEUQR_CONNECTOR_PRODUCT_NAME,
    version: MINEUQR_CONNECTOR_VERSION,
    enrolled: true,
    onLog: (line: string) => {
      void appendLog(line);
    },
  });

  await startConnectorLocalStatusServer({
    getSnapshot: () => supervisor.getSnapshot(),
    onRestart: async () => {
      await supervisor.shutdown();
      void supervisor.runForever();
    },
  });

  const shutdown = async () => {
    await appendLog("Shutting down MineuQR Connector service…");
    await supervisor.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  await appendLog(`MineuQR Connector ${MINEUQR_CONNECTOR_VERSION} service starting.`);
  await supervisor.runForever();
}

const isServiceEntry =
  process.argv[1]?.includes("rlc-service") || process.argv[1]?.includes("rlcServiceMain");

if (isServiceEntry) {
  void main().catch(async (error) => {
    await appendLog(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { main as runRlcService, defaultCloudEndpointFromApiBase };
