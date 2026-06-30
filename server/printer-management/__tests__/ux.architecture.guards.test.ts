import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const clientRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../client/src");

describe("PRINT-UX-1 client architecture guards", () => {
  it("operational workspace does not import platform adapters", () => {
    const panel = readFileSync(
      join(clientRoot, "components/print-workspace/PrintWorkspacePanel.tsx"),
      "utf8"
    );
    expect(panel).not.toMatch(/WindowsPlatform|UsbTransport|createPlatformAdapter/);
    expect(panel).toContain("PrintingStatusBanner");
    expect(panel).toContain("PrintingSetupZone");
    expect(panel).toContain("CurrentPrinterCard");
    expect(panel).not.toMatch(/JSON\.stringify/);
    expect(panel).not.toMatch(/Restaurant Local Connector/);
    expect(panel).not.toMatch(/useDistributedPrintingInfrastructure/);
    expect(panel).not.toMatch(/WorkspaceDiagnosticsSection/);
    expect(panel).not.toMatch(/ConnectorSessionCard/);
    expect(panel).not.toMatch(/LocalConnectorCard/);
  });

  it("printer management panel avoids raw diagnostics for operators", () => {
    const panel = readFileSync(
      join(clientRoot, "components/printer-management/PrinterManagementPanel.tsx"),
      "utf8"
    );
    expect(panel).not.toMatch(/JSON\.stringify/);
    expect(panel).toContain("You have not configured printing yet");
    expect(panel).toContain("Start setup");
  });

  it("printer picker uses distributed read model and provisioning workflow", () => {
    const dialog = readFileSync(
      join(clientRoot, "components/print-workspace/PrinterSelectionDialog.tsx"),
      "utf8"
    );
    expect(dialog).toContain("getLocalConnectorStatus");
    expect(dialog).toContain("printWorkspace.read.discoverPrinters");
    expect(dialog).toContain("filterProductionPrinters");
    expect(dialog).toContain("printerManagement.commands.provisionPrinter");
    expect(dialog).not.toMatch(/navigator\.usb|bluetooth|powershell/i);
    expect(dialog).not.toMatch(/No printers found\./);
    expect(dialog).not.toMatch(/printConnector\.discoverPrinters/);
  });
});

describe("PRINT-UX-2 architecture guards", () => {
  it("presence read service does not modify gateway services", () => {
    const service = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../../print-workspace/read/services/PrintWorkspacePresenceReadService.ts"
      ),
      "utf8"
    );
    expect(service).toContain("ConnectorDirectory");
    expect(service).not.toContain("ConnectorGatewayService");
    expect(service).not.toContain("PrintingService");
  });
});

describe("PRINT-UX-2A architecture guards", () => {
  it("operational view models own print readiness derivation", () => {
    const models = readFileSync(
      join(clientRoot, "lib/print-workspace/operationalViewModels.ts"),
      "utf8"
    );
    expect(models).toContain("deriveOperationalPrintStatus");
    expect(models).toContain("isSimulatedPrinterId");
    expect(models).toContain("deriveProvisioningWorkflowState");
    expect(models).toContain("deriveOnboardingStep");
    expect(models).toContain("derivePrintingReadinessLevel");
  });

  it("main workspace cards hide infrastructure metadata", () => {
    const connector = readFileSync(
      join(clientRoot, "components/print-workspace/LocalConnectorCard.tsx"),
      "utf8"
    );
    expect(connector).not.toMatch(/Connector ID|connectorId|Runtime platform|Last heartbeat/);
    const printer = readFileSync(
      join(clientRoot, "components/print-workspace/CurrentPrinterCard.tsx"),
      "utf8"
    );
    expect(printer).not.toMatch(/platform|transport|capabilities|Driver/);
  });
});
