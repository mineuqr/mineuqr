import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RUNTIME_DISTINCT_ACTION_INTENTIONS,
  RUNTIME_INTERNAL_MODULES,
  RUNTIME_INTERNAL_MODULE_CONSUMERS,
  RUNTIME_INTERNAL_TEST_API,
  RUNTIME_PUBLIC_ACTIONS,
  RUNTIME_PUBLIC_ADVANCED_READ_API,
  RUNTIME_PUBLIC_API,
  RUNTIME_PUBLIC_EXECUTE_API,
  RUNTIME_PUBLIC_READ_API,
  RUNTIME_TRANSITIONAL_COMPATIBILITY_API,
} from "../runtime/runtimeApiGovernance";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      files.push(...walkTsFiles(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      if (entry.name.endsWith(".test.ts")) continue;
      files.push(full);
    }
  }
  return files;
}

function relativeFromRepo(filePath: string): string {
  return relative(repoRoot, filePath).replace(/\\/g, "/");
}

const operationalScreenDirs = [
  join(repoRoot, "client/src/pages/screen"),
  join(repoRoot, "client/src/components/operational-screen"),
  join(repoRoot, "client/src/lib/operational-screen"),
];

const applicationSources = walkTsFiles(join(repoRoot, "client/src/pages/screen"))
  .concat(walkTsFiles(join(repoRoot, "client/src/components/operational-screen")))
  .concat(
    walkTsFiles(join(repoRoot, "client/src/lib/operational-screen")).filter(
      (file) => !file.includes(`${join("lib", "operational-screen", "runtime")}${join.sep}`)
    )
  )
  .map((file) => ({
    path: relativeFromRepo(file),
    source: readFileSync(file, "utf8"),
  }));

const providerSource = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
const publicBarrelSource = read("client/src/lib/operational-screen/runtime/index.ts");
const governanceSource = read("client/src/lib/operational-screen/runtime/runtimeApiGovernance.ts");

describe("RUNTIME-PUBLIC-API-CONSOLIDATION-1", () => {
  it("declares every public read hook in the governance registry", () => {
    for (const hook of RUNTIME_PUBLIC_READ_API) {
      expect(providerSource).toContain(`export function ${hook}(`);
      expect(publicBarrelSource).toContain(hook);
    }
    for (const hook of RUNTIME_PUBLIC_ADVANCED_READ_API) {
      expect(providerSource).toContain(`export function ${hook}(`);
      expect(publicBarrelSource).toContain(hook);
    }
    for (const hook of RUNTIME_PUBLIC_EXECUTE_API) {
      expect(providerSource).toContain(`export function ${hook}(`);
      expect(publicBarrelSource).toContain(hook);
    }
  });

  it("classifies every provider export with an intentional tier", () => {
    const exportNames = [
      ...providerSource.matchAll(/export function (\w+)\(/g),
    ].map((match) => match[1]);

    const classified = new Set([
      ...RUNTIME_PUBLIC_API,
      ...RUNTIME_TRANSITIONAL_COMPATIBILITY_API,
      ...RUNTIME_INTERNAL_TEST_API,
    ]);

    for (const name of exportNames) {
      expect(classified.has(name as never)).toBe(true);
    }
  });

  it("documents classification on every provider export", () => {
    const exportBlocks = providerSource.match(
      /\/\*\*[\s\S]*?@classification[\s\S]*?\*\/\s*export function \w+\(/g
    ) ?? [];
    const exportCount = (providerSource.match(/export function \w+\(/g) ?? []).length;
    expect(exportBlocks.length).toBe(exportCount);
  });

  it("exposes the official public API only through runtime/index.ts", () => {
    for (const hook of RUNTIME_PUBLIC_API) {
      expect(publicBarrelSource).toContain(hook);
    }
    expect(publicBarrelSource).toContain("RuntimeActions");
    expect(publicBarrelSource).not.toMatch(/RuntimeContextFactory|runtimeContextStore|useRuntimeOrchestrator/);
  });

  it("forbids application imports of internal runtime modules", () => {
    const internalImportPatterns = [
      /from ["']@\/lib\/operational-screen\/RuntimeContextFactory["']/,
      /from ["']\.\.?\/.*RuntimeContextFactory["']/,
      /from ["']@\/lib\/operational-screen\/runtimeContextStore["']/,
      /from ["']\.\.?\/.*runtimeContextStore["']/,
      /from ["']@\/lib\/operational-screen\/useRuntimeOrchestrator["']/,
      /from ["']\.\.?\/.*useRuntimeOrchestrator["']/,
    ];

    const allowedConsumers = new Set(RUNTIME_INTERNAL_MODULE_CONSUMERS);

    for (const { path, source } of applicationSources) {
      if (allowedConsumers.has(path)) continue;
      if (path.endsWith("runtimeContextActions.ts")) continue;
      if (path.endsWith("bootstrapLogic.ts")) continue;

      for (const pattern of internalImportPatterns) {
        expect(source, `${path} must not import internal runtime modules`).not.toMatch(pattern);
      }
    }
  });

  it("restricts internal module consumption to runtime infrastructure", () => {
    for (const moduleName of RUNTIME_INTERNAL_MODULES) {
      expect(governanceSource).toContain(`"${moduleName}"`);
    }
    expect(RUNTIME_INTERNAL_MODULE_CONSUMERS).toContain(
      "client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx"
    );
    expect(RUNTIME_INTERNAL_MODULE_CONSUMERS).toContain(
      "client/src/lib/operational-screen/useRuntimeOrchestrator.ts"
    );
  });

  it("keeps useRuntimeActions as the sole public execution surface for application code", () => {
    const shell = read("client/src/components/operational-screen/OperationalScreenShell.tsx");
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");

    expect(shell).toContain("useRuntimeActions");
    expect(entry).toContain("useRuntimeActions");
    expect(shell).not.toContain("useScreenRuntime");
    expect(entry).not.toMatch(/const \{[^}]*retry[^}]*\} = useScreenRuntime\(\)/);
    expect(entry).not.toMatch(/const \{[^}]*unpair[^}]*\} = useScreenRuntime\(\)/);
  });

  it("preserves distinct refresh and reloadConfiguration public contracts", () => {
    const actions = read("client/src/lib/operational-screen/runtimeContextActions.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");

    const reconcileExecutor = read(
      "client/src/lib/operational-screen/orchestration/runtimeReconciliationExecutor.ts"
    );

    for (const action of RUNTIME_DISTINCT_ACTION_INTENTIONS) {
      expect(actions).toContain(`${action}:`);
      expect(orchestrator).toContain(`${action}:`);
    }
    expect(orchestrator).toContain("executeRuntimeReconciliation");
    expect(reconcileExecutor).toContain("applyConfigurationReload");
    expect(reconcileExecutor).toContain("publishSnapshotIfChanged");
    expect(orchestrator).toContain("Distinct public contracts");
  });

  it("delegates all public actions through createRuntimeActions", () => {
    const actions = read("client/src/lib/operational-screen/runtimeContextActions.ts");
    for (const action of RUNTIME_PUBLIC_ACTIONS) {
      expect(actions).toContain(`${action}:`);
    }
    expect(providerSource).toContain("createRuntimeActions({ refresh, reloadConfiguration, unpair, retry })");
  });

  it("retains transitional compatibility APIs without expanding the public contract", () => {
    for (const api of RUNTIME_TRANSITIONAL_COMPATIBILITY_API) {
      if (api.startsWith("use")) {
        expect(providerSource).toContain(`export function ${api}(`);
      } else {
        expect(providerSource).toContain(`export function ${api}(`);
      }
    }
    expect(publicBarrelSource).toContain("useScreenRuntime");
    expect(publicBarrelSource).toContain("useRuntimeContext");
    expect(publicBarrelSource).toMatch(/Transitional compatibility/);
  });

  it("keeps useScreenRuntime for lifecycle and diagnostics subsystems only", () => {
    const roleHost = read("client/src/components/operational-screen/RuntimeRoleHost.tsx");
    const diagnostics = read("client/src/components/operational-screen/ScreenDiagnosticsPanel.tsx");
    const kitchenStream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");

    expect(roleHost).toContain("useScreenRuntime");
    expect(diagnostics).toContain("useScreenRuntime");
    expect(kitchenStream).toContain("useScreenRuntime");
    expect(roleHost).not.toMatch(/\b(refresh|reloadConfiguration|unpair)\b/);
    expect(diagnostics).not.toMatch(/\b(refresh|reloadConfiguration|unpair)\b/);
  });

  it("keeps slice selectors as the preferred read surface for interaction hooks", () => {
    const orderActions = read(
      "client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts"
    );
    expect(orderActions).toContain("useRuntimeRole");
    expect(orderActions).not.toContain("useRuntimeInstanceContext");
    expect(orderActions).not.toContain("RuntimeContextFactory");
  });

  it("does not expose useRuntimeContextStore in the public barrel", () => {
    expect(publicBarrelSource).not.toContain("useRuntimeContextStore");
    for (const api of RUNTIME_INTERNAL_TEST_API) {
      expect(providerSource).toContain(`export function ${api}(`);
    }
  });
});

describe("RUNTIME-PUBLIC-API-CONSOLIDATION-1 boundary scan", () => {
  it("scans operational-screen directories for internal module leakage", () => {
    const allSources = operationalScreenDirs
      .flatMap((dir) => walkTsFiles(dir))
      .map((file) => ({
        path: relativeFromRepo(file),
        source: readFileSync(file, "utf8"),
      }));

    const forbidden = [
      "RuntimeContextFactory",
      "runtimeContextStore",
      "useRuntimeOrchestrator",
    ];
    const allowed = new Set([
      ...RUNTIME_INTERNAL_MODULE_CONSUMERS,
      "client/src/lib/operational-screen/runtimeContextActions.ts",
      "client/src/lib/operational-screen/runtime/runtimeApiGovernance.ts",
      "client/src/lib/operational-screen/runtime/index.ts",
    ]);

    for (const { path, source } of allSources) {
      if (allowed.has(path)) continue;
      if (path.includes("/__tests__/")) continue;

      for (const symbol of forbidden) {
        const importPattern = new RegExp(
          `from ["'][^"']*${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
        );
        expect(source, `${path} leaked ${symbol}`).not.toMatch(importPattern);
      }
    }
  });
});
