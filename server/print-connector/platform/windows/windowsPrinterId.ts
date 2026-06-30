const WINDOWS_PRINTER_ID_PREFIX = "win-";

export function encodeWindowsPrinterId(printerName: string): string {
  return `${WINDOWS_PRINTER_ID_PREFIX}${printerName}`;
}

export function decodeWindowsPrinterId(printerId: string): string | null {
  if (!printerId.startsWith(WINDOWS_PRINTER_ID_PREFIX)) {
    return null;
  }
  const name = printerId.slice(WINDOWS_PRINTER_ID_PREFIX.length);
  return name.length > 0 ? name : null;
}

export function isSimulatedPrinterId(printerId: string): boolean {
  return printerId.includes("-sim-");
}
