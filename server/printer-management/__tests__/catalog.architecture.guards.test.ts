import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("PRINT-PRINTER-CATALOG-1 architecture guards (ADR-ARCH-017)", () => {
  it("getCurrentPrinter does not migrate legacy selection or write catalog", () => {
    const service = readFileSync(
      join(root, "services/PrinterManagementService.ts"),
      "utf8"
    );
    const getCurrentPrinterBody = service.match(
      /async getCurrentPrinter[\s\S]*?(?=\n  async )/
    )?.[0];
    expect(getCurrentPrinterBody).toBeDefined();
    expect(service).not.toContain("getSelectedPrinter");
    expect(getCurrentPrinterBody).not.toContain("printers.save");
    expect(getCurrentPrinterBody).toContain("getDefault(restaurantId)");
  });

  it("printer management composition has no legacy selection repository", () => {
    const composition = readFileSync(join(root, "printerManagementComposition.ts"), "utf8");
    expect(composition).not.toContain("DrizzlePrinterSelectionRepository");
    expect(composition).not.toContain("print_connector_selections");
    expect(composition).toContain("GatewayRoutedPrintConnectorApi");
  });

  it("gateway routed connector api does not persist cloud selection", () => {
    const adapter = readFileSync(
      join(root, "../connector-gateway/adapters/GatewayRoutedPrintConnectorApi.ts"),
      "utf8"
    );
    expect(adapter).not.toContain("PrinterSelectionRepository");
    expect(adapter).not.toContain("DrizzlePrinterSelectionRepository");
    expect(adapter).not.toContain("selectionRepository");
    expect(adapter).toContain("getSelectedPrinter(_restaurantId: number)");
  });

  it("embedded print connector composition uses in-memory selection only", () => {
    const composition = readFileSync(
      join(root, "../print-connector/printConnectorComposition.ts"),
      "utf8"
    );
    expect(composition).toContain("InMemoryPrinterSelectionRepository");
    expect(composition).not.toContain("DrizzlePrinterSelectionRepository");
  });

  it("discovery read service does not write catalog", () => {
    const discovery = readFileSync(
      join(root, "../print-workspace/read/services/PrintWorkspaceDiscoveryReadService.ts"),
      "utf8"
    );
    expect(discovery).not.toMatch(/\.save\(/);
    expect(discovery).not.toContain("restaurant_printers");
    expect(discovery).toContain("routeDiscoverPrinters");
  });

  it("catalog repository remove deactivates without reactivation path in reads", () => {
    const repo = readFileSync(
      join(root, "infrastructure/DrizzleRestaurantPrinterRepository.ts"),
      "utf8"
    );
    expect(repo).toContain("isActive: false");
    expect(repo).toContain("isDefault: false");
  });
});
