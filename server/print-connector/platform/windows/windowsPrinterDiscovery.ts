import type { PrinterInfo } from "../../domain/PrinterInfo";
import { encodeWindowsPrinterId } from "./windowsPrinterId";

/**
 * Multi-line script for powershell.exe -Command (newlines — not semicolon-joined).
 */
export const DISCOVER_PRINTERS_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$default = (Get-CimInstance -ClassName Win32_Printer -Filter \"Default='TRUE'\" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name -First 1)",
  "$printers = @(Get-Printer | Select-Object Name, PrinterStatus, DriverName)",
  "if ($printers.Count -eq 0) { Write-Output '[]'; exit 0 }",
  "$printers | ForEach-Object {",
  "  [PSCustomObject]@{",
  "    Name = $_.Name",
  "    PrinterStatus = [int]$_.PrinterStatus",
  "    DriverName = $_.DriverName",
  "    IsDefault = ($_.Name -eq $default)",
  "  }",
  "} | ConvertTo-Json -Compress",
].join("\n");

type WindowsPrinterRow = {
  Name: string;
  PrinterStatus: number;
  DriverName?: string;
  IsDefault?: boolean;
};

function mapTransport(driverName: string): PrinterInfo["transport"] {
  const lower = driverName.toLowerCase();
  if (lower.includes("usb")) return "usb";
  if (lower.includes("bluetooth")) return "bluetooth";
  if (lower.includes("wifi") || lower.includes("wireless")) return "wifi";
  return "ethernet";
}

function isPrinterOnline(status: number): boolean {
  return status !== 7 && status !== 6;
}

export function mapWindowsPrinterRows(rows: WindowsPrinterRow[]): PrinterInfo[] {
  return rows.map((row) => ({
    id: encodeWindowsPrinterId(row.Name),
    name: row.Name,
    platform: "windows" as const,
    transport: mapTransport(row.DriverName ?? row.Name),
    isDefault: row.IsDefault === true,
    isOnline: isPrinterOnline(row.PrinterStatus),
    location: null,
    manufacturer: null,
  }));
}

export function parseDiscoverStdout(stdout: string): PrinterInfo[] {
  const trimmed = stdout.trim();
  if (!trimmed || trimmed === "null") return [];

  const parsed = JSON.parse(trimmed) as WindowsPrinterRow | WindowsPrinterRow[];
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return mapWindowsPrinterRows(rows);
}
