import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { PrinterInfo } from "../../domain/PrinterInfo";
import { BasePlatformAdapter } from "../BasePlatformAdapter";
import { SimulatedPlatformAdapter } from "../SimulatedPlatformAdapter";
import { shouldUseSimulatedConnector } from "../resolveHostPlatform";

const execFileAsync = promisify(execFile);

function deliverViaLp(printerName: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("lp", ["-d", printerName, "-o", "raw"]);
    child.stdin.write(text);
    child.stdin.end();
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`lp exited with code ${code}`));
    });
  });
}

function mapTransport(description: string): PrinterInfo["transport"] {
  const lower = description.toLowerCase();
  if (lower.includes("usb")) return "usb";
  if (lower.includes("bluetooth")) return "bluetooth";
  if (lower.includes("wifi") || lower.includes("airprint")) return "wifi";
  return "ethernet";
}

export class DarwinPlatformAdapter extends BasePlatformAdapter {
  readonly platform = "macos" as const;

  async discoverPrinters(): Promise<PrinterInfo[]> {
    if (shouldUseSimulatedConnector()) {
      return new SimulatedPlatformAdapter("macos").discoverPrinters();
    }

    try {
      const { stdout } = await execFileAsync("lpstat", ["-p", "-d"], { timeout: 10_000 });
      const lines = stdout.split("\n").filter((line) => line.startsWith("printer "));
      return lines.map((line, index) => {
        const name = line.split(" ")[1] ?? `printer-${index}`;
        return {
          id: `mac-${name}`,
          name,
          platform: "macos" as const,
          transport: mapTransport(line),
          isDefault: index === 0,
          isOnline: !line.includes("disabled"),
          location: null,
          manufacturer: null,
        };
      });
    } catch (error) {
      console.warn(
        "[print-connector] macOS printer discovery failed:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  protected async deliverTextToOsPrinter(printerId: string, text: string): Promise<void> {
    const printerName = printerId.replace(/^mac-/, "");
    await deliverViaLp(printerName, text);
  }
}
