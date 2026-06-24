/**
 * THERMAL-PRINTING-13I.2E.2 — interactive printer binding CLI for Windows POS hosts.
 *
 * Usage:
 *   pnpm exec tsx scripts/bind-printers.ts --config config/mineuqr-agent-config.json
 *   node bind-printers.mjs --config ../config/mineuqr-agent-config.json --status
 */
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  applyStoredPrinterBindings,
  discoverWindowsPrinters,
  evaluateBindingDiagnostics,
  formatBindingDiagnosticLine,
  loadPrinterBindingsFile,
  resolvePrinterBindingsPath,
  savePrinterBindingsFile,
  upsertStoredPrinterBinding,
  writeBindingDiagnosticsReport,
  type WindowsPrinterDiscoveryClient,
} from "../agent/bindings";
import { loadDeploymentConfig, resolveDeploymentConfigPath } from "../agent/config";
import type { PrinterDiscoveryResult } from "../shared/printing/printerBinding";
import type { StoredPrinterBinding } from "../shared/printing/printerBinding";

function parseConfigArg(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config" && argv[index + 1]) {
      return argv[index + 1];
    }
    if (arg.startsWith("--config=")) {
      return arg.slice("--config=".length);
    }
  }
  return undefined;
}

function hasStatusFlag(argv: string[]): boolean {
  return argv.includes("--status");
}

function listLogicalPrinters(config: Awaited<ReturnType<typeof loadDeploymentConfig>>) {
  return config.startupPrinters.map((profile) => ({
    profileId: profile.printerId,
    logicalPrinterName: profile.printerName,
  }));
}

async function promptForPrinterSelection(input: {
  logicalPrinterName: string;
  printers: PrinterDiscoveryResult[];
  readline: ReturnType<typeof createInterface>;
}): Promise<PrinterDiscoveryResult | null> {
  const { logicalPrinterName, printers, readline } = input;

  if (printers.length === 0) {
    console.error("No Windows printers were discovered on this device.");
    return null;
  }

  console.log("");
  console.log(`Select the Windows printer for: ${logicalPrinterName}`);
  printers.forEach((printer, index) => {
    console.log(`  ${index + 1}. ${printer.printerName} (${printer.portName})`);
  });
  console.log("  0. Skip for now");

  const answer = (await readline.question("Enter choice number: ")).trim();
  const choice = Number.parseInt(answer, 10);
  if (!Number.isInteger(choice) || choice < 0 || choice > printers.length) {
    console.error("Invalid choice. Skipping this printer.");
    return null;
  }
  if (choice === 0) {
    return null;
  }

  return printers[choice - 1] ?? null;
}

async function runBindingStatus(input: {
  configPath: string;
  discoveryClient: WindowsPrinterDiscoveryClient;
}): Promise<void> {
  const config = await loadDeploymentConfig({ configPath: input.configPath });
  const bindingsPath = resolvePrinterBindingsPath(input.configPath);
  const bindingsFile = await loadPrinterBindingsFile(bindingsPath);
  const discovered = await input.discoveryClient.discoverPrinters();
  const report = evaluateBindingDiagnostics({
    config,
    bindingsFile,
    discoveredPrinters: discovered,
    configPath: input.configPath,
    bindingsPath,
  });

  const diagnosticsPath = await writeBindingDiagnosticsReport(input.configPath, report);
  console.log(`[BindPrinters] Diagnostics written: ${diagnosticsPath}`);
  for (const item of report.items) {
    console.log(`[BindPrinters] ${formatBindingDiagnosticLine(item)}`);
  }
}

async function runInteractiveBinding(input: {
  configPath: string;
  discoveryClient: WindowsPrinterDiscoveryClient;
}): Promise<void> {
  const baseConfig = await loadDeploymentConfig({ configPath: input.configPath });
  const bindingsPath = resolvePrinterBindingsPath(input.configPath);
  const existing = (await loadPrinterBindingsFile(bindingsPath))?.bindings ?? [];
  const discovered = await input.discoveryClient.discoverPrinters();

  if (discovered.length === 0) {
    throw new Error("No Windows printers discovered. Install your thermal printer driver first.");
  }

  const readline = createInterface({ input, output });
  let bindings = [...existing];

  try {
    for (const logical of listLogicalPrinters(baseConfig)) {
      const selected = await promptForPrinterSelection({
        logicalPrinterName: logical.logicalPrinterName,
        printers: discovered,
        readline,
      });
      if (!selected) {
        continue;
      }

      const next: StoredPrinterBinding = {
        profileId: logical.profileId,
        logicalPrinterName: logical.logicalPrinterName,
        windowsPrinterName: selected.printerName,
        portName: selected.portName,
        bindingStatus: "bound",
      };
      bindings = upsertStoredPrinterBinding(bindings, next);
      console.log(
        `[BindPrinters] Saved ${logical.logicalPrinterName} → ${selected.printerName} (${selected.portName})`
      );
    }
  } finally {
    readline.close();
  }

  if (bindings.length === 0) {
    console.log("[BindPrinters] No bindings were saved.");
    return;
  }

  const saved = await savePrinterBindingsFile(bindingsPath, bindings);
  console.log(`[BindPrinters] Bindings saved: ${bindingsPath}`);
  console.log(`[BindPrinters] Updated at: ${saved.updatedAt}`);

  const merged = applyStoredPrinterBindings(baseConfig, saved);
  const report = evaluateBindingDiagnostics({
    config: merged,
    bindingsFile: saved,
    discoveredPrinters: discovered,
    configPath: input.configPath,
    bindingsPath,
  });
  await writeBindingDiagnosticsReport(input.configPath, report);

  console.log("");
  console.log("Binding summary:");
  for (const item of report.items) {
    console.log(`  ${formatBindingDiagnosticLine(item)}`);
  }
  console.log("");
  console.log("Next steps:");
  console.log("  1. Start or restart the print agent.");
  console.log("  2. Open your MineuQR dashboard and run Test Print.");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const configPath = resolveDeploymentConfigPath({ configPath: parseConfigArg(argv) });
  const discoveryClient: WindowsPrinterDiscoveryClient = {
    discoverPrinters: () => discoverWindowsPrinters(),
  };

  if (hasStatusFlag(argv)) {
    await runBindingStatus({ configPath, discoveryClient });
    return;
  }

  await runInteractiveBinding({
    configPath,
    discoveryClient,
  });
}

main().catch((error) => {
  console.error("[BindPrinters] Failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
