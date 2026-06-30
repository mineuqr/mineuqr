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
    expect(panel).toContain("CurrentPrinterCard");
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
