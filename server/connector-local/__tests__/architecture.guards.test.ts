import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { composeConnectorLocal } from "../connectorLocalComposition";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";
import { adaptConnectorPeerTransport } from "../infrastructure/adaptConnectorPeerTransport";
import { StaticGatewayTransportFactory } from "../infrastructure/StaticGatewayTransportFactory";
import { createInProcessTransportPair } from "../../connector-session/infrastructure/InProcessConnectorTransport";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gatewayRoot = join(root, "..", "connector-gateway");
const sessionRoot = join(root, "..", "connector-session");
const printingRoot = join(root, "..", "printing");

describe("PRINT-CONNECTOR-LOCAL-1 architecture guards", () => {
  it("composes local connector without business layer imports", () => {
    const transport = createInProcessTransportPair();
    const local = composeConnectorLocal({
      configProvider: { load: () => createTestLocalConnectorConfig() },
      transportFactory: new StaticGatewayTransportFactory(adaptConnectorPeerTransport(transport.connector)),
    });
    expect(local.bootstrap).toBeDefined();
  });

  it("RLC services do not import PrintingService or Order domain", () => {
    const files = [
      "services/LocalConnectorBootstrap.ts",
      "services/ConnectorSessionClient.ts",
      "connectorLocalComposition.ts",
    ];

    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source).not.toContain("PrintingService");
      expect(source).not.toContain("OrderRepository");
      expect(source).not.toContain("PrintConnectorPort");
    }
  });

  it("does not modify gateway or session service implementations", () => {
    const gatewayService = readFileSync(
      join(gatewayRoot, "services", "ConnectorGatewayService.ts"),
      "utf8"
    );
    const sessionHandler = readFileSync(
      join(sessionRoot, "services", "ConnectorSessionTransportHandler.ts"),
      "utf8"
    );
    expect(gatewayService).toContain("routePrint");
    expect(sessionHandler).toContain("handleAuth");
  });

  it("uses outbound session contracts only from connector-session", () => {
    const source = readFileSync(join(root, "services", "ConnectorSessionClient.ts"), "utf8");
    expect(source).toContain("sendInbound");
    expect(source).not.toContain("ConnectorSessionManager");
    expect(source).not.toContain("acceptConnection");
  });

  it("defers platform printing to later programs", () => {
    const source = readFileSync(
      join(root, "infrastructure", "DeferredConnectorCommandHandler.ts"),
      "utf8"
    );
    expect(source).toContain("platform_execution_deferred");
  });

  it("runtime handler delegates to PrintConnectorRuntime not PrintingService", () => {
    const source = readFileSync(join(root, "infrastructure", "RuntimeConnectorCommandHandler.ts"), "utf8");
    expect(source).toContain("LocalConnectorRuntimeFacade");
    expect(source).not.toContain("PrintingService");
  });

  it("Windows RLC hosts WindowsPlatformAdapter", () => {
    const source = readFileSync(join(root, "services", "PlatformAdapterHost.ts"), "utf8");
    expect(source).toContain("WindowsPlatformAdapter");
    expect(source).not.toContain("LinuxPlatformAdapter");
  });

  it("PrintConnectorPort remains unchanged", () => {
    const source = readFileSync(
      join(printingRoot, "contracts", "ports", "PrintConnectorPort.ts"),
      "utf8"
    );
    expect(source).toContain("submit(submission: PrintConnectorSubmission)");
    expect(source).toContain("cancel(request: PrintConnectorCancelRequest)");
  });
});
