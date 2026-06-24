/**
 * THERMAL-PRINTING-13I.2E.2 — local printer binding persistence.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  PRINTER_BINDINGS_FILE_VERSION,
  type PrinterBindingsFile,
  type StoredPrinterBinding,
} from "../../shared/printing/printerBinding";

export const DEFAULT_BINDINGS_FILENAME = "printer-bindings.json";

export function resolvePrinterBindingsPath(configPath: string): string {
  return join(dirname(configPath), DEFAULT_BINDINGS_FILENAME);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function createPrinterBindingsFile(
  bindings: StoredPrinterBinding[]
): PrinterBindingsFile {
  return {
    version: PRINTER_BINDINGS_FILE_VERSION,
    bindings,
    updatedAt: new Date().toISOString(),
  };
}

export async function loadPrinterBindingsFile(
  bindingsPath: string
): Promise<PrinterBindingsFile | null> {
  if (!(await pathExists(bindingsPath))) {
    return null;
  }

  const raw = JSON.parse(await readFile(bindingsPath, "utf8")) as unknown;
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid printer bindings file: ${bindingsPath}`);
  }

  const file = raw as PrinterBindingsFile;
  if (!Array.isArray(file.bindings)) {
    throw new Error(`printer-bindings.json must include bindings[]: ${bindingsPath}`);
  }

  return file;
}

export async function savePrinterBindingsFile(
  bindingsPath: string,
  bindings: StoredPrinterBinding[]
): Promise<PrinterBindingsFile> {
  const file = createPrinterBindingsFile(bindings);
  await mkdir(dirname(bindingsPath), { recursive: true });
  await writeFile(bindingsPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return file;
}
