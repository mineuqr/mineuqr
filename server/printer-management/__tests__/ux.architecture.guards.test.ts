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
    expect(panel).toContain("LocalConnectorCard");
    expect(panel).toContain("ConnectorSessionCard");
    expect(panel).toContain("CurrentPrinterCard");
    expect(panel).not.toMatch(/JSON\.stringify/);
  });

  it("printer picker uses connector API contracts only", () => {
    const dialog = readFileSync(
      join(clientRoot, "components/print-workspace/PrinterSelectionDialog.tsx"),
      "utf8"
    );
    expect(dialog).toContain("printConnector.discoverPrinters");
    expect(dialog).toContain("printerManagement.commands.provisionPrinter");
    expect(dialog).not.toMatch(/navigator\.usb|bluetooth|powershell/i);
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
