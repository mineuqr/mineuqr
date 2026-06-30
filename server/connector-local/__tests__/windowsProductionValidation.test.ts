import { describe, expect, it } from "vitest";
import { parseDiscoverStdout } from "../../print-connector/platform/windows/windowsPrinterDiscovery";
import { isRlcWindowsHost } from "../windows/createRlcWindowsConnectorRuntime";

const validateWindows = process.env.RLC_VALIDATE_WINDOWS === "1";

describe.skipIf(!validateWindows || !isRlcWindowsHost())(
  "Windows production validation (RLC_VALIDATE_WINDOWS=1)",
  () => {
    it("discovers real Windows printers without simulated entries", async () => {
      process.env.RLC_RUNTIME = "1";
      const { WindowsPlatformAdapter } = await import(
        "../../print-connector/platform/windows/WindowsPlatformAdapter"
      );
      const adapter = new WindowsPlatformAdapter();
      const printers = await adapter.discoverPrinters();

      expect(printers.every((p) => !p.id.startsWith("sim:"))).toBe(true);
      for (const printer of printers) {
        expect(printer.platform).toBe("windows");
        expect(printer.name.length).toBeGreaterThan(0);
      }
    });
  }
);

describe("parseDiscoverStdout", () => {
  it("parses Windows printer JSON", () => {
    const stdout = JSON.stringify([
      {
        Name: "EPSON TM-T88",
        PrinterStatus: 0,
        DriverName: "EPSON USB",
        IsDefault: true,
      },
    ]);

    const printers = parseDiscoverStdout(stdout);
    expect(printers[0]?.name).toBe("EPSON TM-T88");
    expect(printers[0]?.isDefault).toBe(true);
    expect(printers[0]?.isOnline).toBe(true);
  });
});
