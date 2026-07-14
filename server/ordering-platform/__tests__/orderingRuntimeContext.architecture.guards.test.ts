import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "__tests__") continue;
      collectTsFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("ORDERING-RUNTIME-CONTEXT-1 server architecture guards", () => {
  it("registers runtime context factory as platform ownership", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toContain("ORDERING_PLATFORM_RUNTIME_CONTEXT_FACTORY");
    expect(ownership).toContain("OrderingRuntimeContextFactory");
    expect(ownership).toContain("ORDERING_PLATFORM_RUNTIME_CONTEXT_CONTRACT");
  });

  it("factory is the only OrderingRuntimeContext construction path on server", () => {
    const factory = read("server/ordering-platform/OrderingRuntimeContextFactory.ts");
    expect(factory).toContain("class OrderingRuntimeContextFactory");
    expect(factory).toContain("freezeOrderingRuntimeContext");
    expect(factory).toContain("create(input");

    const serverFiles = collectTsFiles(join(repoRoot, "server"));
    const constructors = serverFiles.filter((file) => {
      if (file.replace(/\\/g, "/").endsWith("ordering-platform/OrderingRuntimeContextFactory.ts")) {
        return false;
      }
      const src = readFileSync(file, "utf8");
      return (
        src.includes("freezeOrderingRuntimeContext") ||
        /OrderingRuntimeContext\s*=\s*\{/.test(src) ||
        src.includes("new OrderingRuntimeContext")
      );
    });

    expect(constructors).toEqual([]);
  });

  it("shared contract defines OrderingRuntimeContext without presentation form factors", () => {
    const runtime = read("shared/ordering-platform/orderingRuntimeContract.ts");
    expect(runtime).toContain("OrderingRuntimeContext");
    expect(runtime).toContain("OrderingRuntimeContextInput");
    expect(runtime).toContain("ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION");
    expect(runtime).not.toMatch(/\borientation\s*:/);
    expect(runtime).not.toMatch(/\bscreenWidth\s*:/);
    expect(runtime).not.toMatch(/\bformFactor\s*:/);
    expect(runtime).not.toMatch(/\bdeviceType\s*:/);
  });

  it("platform owned concerns include runtime context ownership", () => {
    const contracts = read("shared/ordering-platform/orderingPlatformContracts.ts");
    expect(contracts).toContain('"ordering_runtime_context"');
    expect(contracts).toContain('"ordering_runtime_context_factory"');
  });
});
