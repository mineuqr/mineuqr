import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { PrinterInfo } from "../../domain/PrinterInfo";
import { BasePlatformAdapter } from "../BasePlatformAdapter";
import { shouldUseSimulatedConnector } from "../resolveHostPlatform";
import { SimulatedPlatformAdapter } from "../SimulatedPlatformAdapter";
import {
  decodeWindowsPrinterId,
  isSimulatedPrinterId,
} from "./windowsPrinterId";
import { DISCOVER_PRINTERS_SCRIPT, parseDiscoverStdout } from "./windowsPrinterDiscovery";

const execFileAsync = promisify(execFile);

export class WindowsPlatformAdapter extends BasePlatformAdapter {
  readonly platform = "windows" as const;

  async discoverPrinters(): Promise<PrinterInfo[]> {
    if (shouldUseSimulatedConnector()) {
      return new SimulatedPlatformAdapter("windows").discoverPrinters();
    }

    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", DISCOVER_PRINTERS_SCRIPT],
        { timeout: 15_000, windowsHide: true }
      );

      return parseDiscoverStdout(stdout);
    } catch (error) {
      console.warn(
        "[print-connector] Windows printer discovery failed:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  protected async deliverTextToOsPrinter(printerId: string, text: string): Promise<void> {
    if (isSimulatedPrinterId(printerId)) {
      throw new Error("Simulated printer cannot be used in production mode");
    }

    const printerName = decodeWindowsPrinterId(printerId);
    if (!printerName) {
      throw new Error("Invalid Windows printer identifier");
    }

    const tempPath = join(tmpdir(), `mineuqr-print-${randomUUID()}.txt`);
    await writeFile(tempPath, text, "utf8");

    const escapedPath = tempPath.replace(/'/g, "''");
    const escapedName = printerName.replace(/'/g, "''");
    const command = `Get-Content -LiteralPath '${escapedPath}' -Raw | Out-Printer -Name '${escapedName}'`;

    try {
      await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
        { timeout: 60_000, windowsHide: true }
      );
    } finally {
      await unlink(tempPath).catch(() => undefined);
    }
  }
}
