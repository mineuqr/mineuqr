/**
 * THERMAL-PRINTING-13I.2E.2 — binding diagnostics persistence.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BindingDiagnosticsReport } from "../../shared/printing/printerBinding";

export const BINDING_DIAGNOSTICS_FILENAME = "binding-diagnostics.json";

export function resolveBindingDiagnosticsPath(configPath: string): string {
  return join(dirname(configPath), BINDING_DIAGNOSTICS_FILENAME);
}

export async function writeBindingDiagnosticsReport(
  configPath: string,
  report: BindingDiagnosticsReport
): Promise<string> {
  const diagnosticsPath = resolveBindingDiagnosticsPath(configPath);
  await mkdir(dirname(diagnosticsPath), { recursive: true });
  await writeFile(diagnosticsPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return diagnosticsPath;
}
