/**
 * THERMAL-PRINTING-13I.2E.2 — discover Windows spooler printers via PowerShell Get-Printer.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PrinterDiscoveryResult } from "../../shared/printing/printerBinding";

const execFileAsync = promisify(execFile);

export interface WindowsPrinterDiscoveryClient {
  discoverPrinters(): Promise<PrinterDiscoveryResult[]>;
}

type PowerShellPrinterRow = {
  Name?: string;
  PortName?: string;
};

function normalizeDiscoveryRows(raw: unknown): PrinterDiscoveryResult[] {
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const printers: PrinterDiscoveryResult[] = [];

  for (const row of rows as PowerShellPrinterRow[]) {
    const printerName = row.Name?.trim();
    const portName = row.PortName?.trim();
    if (!printerName || !portName) {
      continue;
    }
    printers.push({ printerName, portName });
  }

  return printers.sort((left, right) => left.printerName.localeCompare(right.printerName));
}

export class PowerShellWindowsPrinterDiscoveryClient implements WindowsPrinterDiscoveryClient {
  constructor(private readonly powershellPath = "powershell.exe") {}

  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "Get-Printer | Select-Object Name, PortName | ConvertTo-Json -Compress",
    ].join("; ");

    const { stdout } = await execFileAsync(
      this.powershellPath,
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
      }
    );

    const trimmed = stdout.trim();
    if (!trimmed) {
      return [];
    }

    return normalizeDiscoveryRows(JSON.parse(trimmed) as unknown);
  }
}

export class MemoryWindowsPrinterDiscoveryClient implements WindowsPrinterDiscoveryClient {
  constructor(private readonly printers: PrinterDiscoveryResult[] = []) {}

  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    return [...this.printers];
  }
}

export const DEFAULT_WINDOWS_PRINTER_DISCOVERY_CLIENT = new PowerShellWindowsPrinterDiscoveryClient();

export async function discoverWindowsPrinters(
  client: WindowsPrinterDiscoveryClient = DEFAULT_WINDOWS_PRINTER_DISCOVERY_CLIENT
): Promise<PrinterDiscoveryResult[]> {
  return client.discoverPrinters();
}
