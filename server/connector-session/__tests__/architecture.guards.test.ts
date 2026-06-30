import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { composeConnectorNetwork } from "../networkComposition";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gatewayRoot = join(root, "..", "connector-gateway");
const printingRoot = join(root, "..", "printing");

describe("PRINT-CONNECTOR-NETWORK-1 architecture guards", () => {
  it("composes network layer with gateway integration", () => {
    const network = composeConnectorNetwork();
    expect(network.session.executionPort).toBeDefined();
    expect(network.gateway.gateway).toBeDefined();
  });

  it("session layer does not import printing service or order domain", () => {
    const files = [
      "services/ConnectorSessionTransportHandler.ts",
      "services/ConnectorCommandRouter.ts",
      "adapters/SessionConnectorExecutionPort.ts",
    ];

    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source).not.toContain("PrintingService");
      expect(source).not.toContain("OrderRepository");
      expect(source).not.toMatch(/WindowsPlatformAdapter|PrintConnectorRuntime/);
    }
  });

  it("transport abstraction has no concrete WebSocket or gRPC imports", () => {
    const source = readFileSync(join(root, "contracts/ConnectorTransportPort.ts"), "utf8");
    expect(source).not.toContain("WebSocket");
    expect(source).not.toContain("grpc");
    expect(source).toContain("ConnectorTransportConnection");
  });

  it("gateway composition uses network execution port by default", () => {
    const source = readFileSync(join(gatewayRoot, "gatewayComposition.ts"), "utf8");
    expect(source).toContain("connectorNetworkComposition");
    expect(source).not.toContain("PrintingService");
  });

  it("PrintConnectorPort and PrintingService remain unchanged", () => {
    const portSource = readFileSync(
      join(printingRoot, "contracts", "ports", "PrintConnectorPort.ts"),
      "utf8"
    );
    const serviceSource = readFileSync(join(printingRoot, "application", "PrintingService.ts"), "utf8");
    expect(portSource).toContain("submit(submission: PrintConnectorSubmission): Promise<void>");
    expect(serviceSource).not.toMatch(/ConnectorSession|ConnectorTransport/);
  });

  it("heartbeat protocol contains no business logic", () => {
    const source = readFileSync(join(root, "services/ConnectorHeartbeatProtocol.ts"), "utf8");
    expect(source).not.toContain("PrintJob");
    expect(source).not.toContain("order_read_");
    expect(source).toContain("gateway.heartbeat");
  });
});
