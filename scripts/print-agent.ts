/**
 * THERMAL-PRINTING-12B — production print agent entrypoint.
 *
 * Usage:
 *   pnpm exec tsx scripts/print-agent.ts
 *   pnpm exec tsx scripts/print-agent.ts --config agent/config/production.example.json
 *
 * Environment overrides:
 *   PRINT_AGENT_CONFIG_PATH
 *   PRINT_AGENT_SERVER_URL
 *   PRINT_AGENT_ID
 *   PRINT_AGENT_AGENT_NAME
 */
import "dotenv/config";
import {
  discoverWindowsPrinters,
  evaluateBindingDiagnostics,
  formatBindingDiagnosticLine,
  loadPrinterBindingsFile,
  resolvePrinterBindingsPath,
  writeBindingDiagnosticsReport,
} from "../agent/bindings";
import {
  bootAgentFromDeploymentConfig,
  loadDeploymentConfig,
  resolveDeploymentConfigPath,
} from "../agent/config";
import { shutdownAgent } from "../agent/runtime/shutdown";

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

async function main(): Promise<void> {
  const configPath = resolveDeploymentConfigPath({
    configPath: parseConfigArg(process.argv.slice(2)),
  });
  const config = await loadDeploymentConfig({ configPath });

  try {
    const bindingsPath = resolvePrinterBindingsPath(configPath);
    const bindingsFile = await loadPrinterBindingsFile(bindingsPath);
    const discovered = await discoverWindowsPrinters();
    const report = evaluateBindingDiagnostics({
      config,
      bindingsFile,
      discoveredPrinters: discovered,
      configPath,
      bindingsPath,
    });
    const diagnosticsPath = await writeBindingDiagnosticsReport(configPath, report);
    console.log(`[PrintAgent] Binding diagnostics: ${diagnosticsPath}`);
    for (const item of report.items) {
      console.log(`[PrintAgent] ${formatBindingDiagnosticLine(item)}`);
    }
  } catch (error) {
    console.warn(
      `[PrintAgent] Binding diagnostics skipped: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const runtime = await bootAgentFromDeploymentConfig(config);

  console.log(
    `[PrintAgent] Ready agentId=${runtime.identity.agentId} lifecycle=${runtime.lifecycle.getState()} profiles=${config.startupPrinters.length}`
  );

  const shutdown = async (signal: string) => {
    console.log(`[PrintAgent] Received ${signal}, shutting down...`);
    await shutdownAgent(runtime);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error) => {
  console.error("[PrintAgent] Startup failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
