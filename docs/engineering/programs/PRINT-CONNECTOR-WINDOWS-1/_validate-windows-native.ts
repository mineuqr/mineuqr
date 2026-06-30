/**
 * PRINT-CONNECTOR-WINDOWS-1 — read-only native Windows validation (certification).
 * Run: npx tsx docs/engineering/programs/PRINT-CONNECTOR-WINDOWS-1/_validate-windows-native.ts
 */
import { createPlatformAdapter } from "../../../../server/print-connector/platform/createPlatformAdapter";
import {
  getHostProcessPlatform,
  resolveHostPlatformType,
} from "../../../../server/print-connector/platform/resolveHostPlatform";

const report: Record<string, unknown> = {
  hostProcessPlatform: getHostProcessPlatform(),
  resolvedPlatform: resolveHostPlatformType(),
  adapterPlatform: null,
  printerCount: 0,
  printers: [] as unknown[],
  simulatedCount: 0,
};

const adapter = createPlatformAdapter();
report.adapterPlatform = adapter.platform;

const printers = await adapter.discoverPrinters();
report.printerCount = printers.length;
report.simulatedCount = printers.filter((p) => p.location === "simulated").length;
report.printers = printers.map((p) => ({
  id: p.id,
  name: p.name,
  isDefault: p.isDefault,
  isOnline: p.isOnline,
  location: p.location,
}));

if (printers.length > 0) {
  const sample = printers[0]!;
  report.sampleStatus = await adapter.getPrinterStatus(sample.id);
  report.sampleCapabilities = await adapter.getPrinterCapabilities(sample.id);
}

console.log(JSON.stringify(report, null, 2));
