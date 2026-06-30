import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = join(root, "../../client/src");

describe("PRINT-CONNECTOR-DISCOVERY-1 architecture guards", () => {
  it("print connector router is retired from production", () => {
    const router = readFileSync(join(root, "../print-connector/printConnectorRouter.ts"), "utf8");
    expect(router).toContain("router({})");
    expect(router).not.toMatch(/discoverPrinters:\s*verifiedProcedure/);
    expect(router).not.toMatch(/selectPrinter:\s*verifiedProcedure/);
    expect(router).not.toMatch(/getSelectedPrinter:\s*verifiedProcedure/);
  });

  it("gateway routed connector api does not use embedded runtime", () => {
    const adapter = readFileSync(
      join(root, "../connector-gateway/adapters/GatewayRoutedPrintConnectorApi.ts"),
      "utf8"
    );
    expect(adapter).toContain("routeExecutePrint");
    expect(adapter).toContain("routeSelectPrinter");
    expect(adapter).toContain("routeCancelPrint");
    expect(adapter).not.toContain("embeddedRuntime");
  });

  it("printer management composition routes all connector ops through gateway adapter", () => {
    const composition = readFileSync(
      join(root, "../printer-management/printerManagementComposition.ts"),
      "utf8"
    );
    expect(composition).toContain("GatewayRoutedPrintConnectorApi");
    expect(composition).not.toContain("printConnectorRuntime");
  });

  it("gateway routes discovery without performing native discovery", () => {
    const service = readFileSync(
      join(root, "../connector-gateway/services/ConnectorGatewayService.ts"),
      "utf8"
    );
    expect(service).toContain("routeDiscoverPrinters");
    expect(service).not.toMatch(/\.discoverPrinters\(/);
    expect(service).not.toContain("PlatformAdapter");
  });

  it("session execution port transports discover_printers commands only", () => {
    const port = readFileSync(
      join(root, "../connector-session/adapters/SessionConnectorExecutionPort.ts"),
      "utf8"
    );
    expect(port).toContain("routeDiscoverPrinters");
    expect(port).not.toContain("WindowsPlatformAdapter");
    expect(port).not.toMatch(/\.discoverPrinters\(/);
  });

  it("workspace provisioning uses distributed discovery read API", () => {
    const dialog = readFileSync(
      join(clientRoot, "components/print-workspace/PrinterSelectionDialog.tsx"),
      "utf8"
    );
    expect(dialog).toContain("printWorkspace.read.discoverPrinters");
    expect(dialog).not.toMatch(/printConnector\.discoverPrinters/);
  });
});
