import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PrinterInfo } from "../../domain/PrinterInfo";
import { BasePlatformAdapter } from "../BasePlatformAdapter";
import { SimulatedPlatformAdapter } from "../SimulatedPlatformAdapter";
import { shouldUseSimulatedConnector } from "../resolveHostPlatform";

const execFileAsync = promisify(execFile);

function mapTransport(driverName: string): PrinterInfo["transport"] {
  const lower = driverName.toLowerCase();
  if (lower.includes("usb")) return "usb";
  if (lower.includes("bluetooth")) return "bluetooth";
  if (lower.includes("wifi") || lower.includes("wireless")) return "wifi";
  return "ethernet";
}

export class WindowsPlatformAdapter extends BasePlatformAdapter {
  readonly platform = "windows" as const;

  async discoverPrinters(): Promise<PrinterInfo[]> {
    if (shouldUseSimulatedConnector()) {
      return new SimulatedPlatformAdapter("windows").discoverPrinters();
    }

    try {
      const { stdout } = await execFileAsync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "Get-Printer | Select-Object Name, PrinterStatus, DriverName | ConvertTo-Json -Compress",
        ],
        { timeout: 10_000, windowsHide: true }
      );

      const parsed = JSON.parse(stdout || "[]") as
        | Array<{ Name: string; PrinterStatus: number; DriverName?: string }>
        | { Name: string; PrinterStatus: number; DriverName?: string };

      const rows = Array.isArray(parsed) ? parsed : [parsed];

      return rows.map((row, index) => ({
        id: `win-${row.Name}`,
        name: row.Name,
        platform: "windows" as const,
        transport: mapTransport(row.DriverName ?? row.Name),
        isDefault: index === 0,
        isOnline: row.PrinterStatus === 0,
        location: null,
        manufacturer: null,
      }));
    } catch {
      return new SimulatedPlatformAdapter("windows").discoverPrinters();
    }
  }

  protected async deliverTextToOsPrinter(printerId: string, text: string): Promise<void> {
    const printerName = printerId.replace(/^win-/, "");
    const escaped = text.replace(/'/g, "''");
    await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `'${escaped}' | Out-Printer -Name '${printerName.replace(/'/g, "''")}'`,
      ],
      { timeout: 30_000, windowsHide: true }
    );
  }
}
