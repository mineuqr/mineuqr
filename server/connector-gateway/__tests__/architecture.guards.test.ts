import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { composeConnectorGateway } from "../gatewayComposition";
import { RemotePrintConnectorPort } from "../adapters/RemotePrintConnectorPort";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const printingRoot = join(root, "..", "printing");
const printConnectorRoot = join(root, "..", "print-connector");

describe("PRINT-GATEWAY-1 architecture guards", () => {
  it("composes gateway without printing service coupling", () => {
    const composition = composeConnectorGateway();
    expect(composition.gateway).toBeDefined();
    expect(composition.createRemotePrintConnectorPort).toBeTypeOf("function");
  });

  it("remote port implements PrintConnectorPort submit and cancel", () => {
    const source = readFileSync(join(root, "adapters", "RemotePrintConnectorPort.ts"), "utf8");
    expect(source).toContain("implements PrintConnectorPort");
    expect(source).toContain("routeExecutePrint");
    expect(source).toContain("routeCancelPrint");
    expect(source).not.toContain("WindowsPlatformAdapter");
    expect(source).not.toContain("ConnectorRuntime");
  });

  it("gateway does not import order domain or printing service", () => {
    const serviceFiles = [
      "services/ConnectorGatewayService.ts",
      "services/ConnectorRegistry.ts",
      "services/ConnectorResolver.ts",
      "services/ConnectorHealthService.ts",
      "services/ConnectorDirectory.ts",
    ];

    for (const file of serviceFiles) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source).not.toContain("OrderRepository");
      expect(source).not.toContain("PrintingService");
      expect(source).not.toContain("PrintJobRepository");
    }
  });

  it("PrintConnectorPort interface includes distributed execution contracts", () => {
    const source = readFileSync(
      join(printingRoot, "contracts", "ports", "PrintConnectorPort.ts"),
      "utf8"
    );
    expect(source).toContain("submit(submission: PrintConnectorSubmission)");
    expect(source).toContain("cancel(request: PrintConnectorCancelRequest)");
    expect(source).not.toContain("routePrint");
  });

  it("printing service depends only on PrintConnectorPort abstraction", () => {
    const source = readFileSync(join(printingRoot, "application", "PrintingService.ts"), "utf8");
    expect(source).toContain("PrintConnectorPort");
    expect(source).not.toMatch(/RemotePrintConnectorPort|ConnectorGatewayService/);
  });

  it("execution mode selection lives in composition roots only", () => {
    const printingComposition = readFileSync(
      join(printingRoot, "printingComposition.ts"),
      "utf8"
    );
    expect(printingComposition).toContain("resolvePrintConnectorExecutionMode");
    expect(printingComposition).toContain("createRemotePrintConnectorPort");

    const gatewayComposition = readFileSync(join(root, "gatewayComposition.ts"), "utf8");
    expect(gatewayComposition).toContain("composeConnectorGateway");
    expect(gatewayComposition).not.toContain("PrintingService");
  });

  it("platform adapters remain in print-connector module", () => {
    const gatewaySource = readFileSync(join(root, "gatewayComposition.ts"), "utf8");
    expect(gatewaySource).not.toContain("createPlatformAdapter");

    const adapterSource = readFileSync(
      join(printConnectorRoot, "infrastructure", "adapters", "PrintingServicePrintConnectorAdapter.ts"),
      "utf8"
    );
    expect(adapterSource).toContain("ConnectorRuntime");
  });

  it("RemotePrintConnectorPort is a valid PrintConnectorPort adapter", () => {
    const port = new RemotePrintConnectorPort(composeConnectorGateway().gateway, {
      reportPrintingStarted: async () => {},
      reportPrintSuccess: async () => {},
      reportPrintFailure: async () => {},
    });
    expect(port.submit).toBeTypeOf("function");
    expect(port.cancel).toBeTypeOf("function");
  });
});
