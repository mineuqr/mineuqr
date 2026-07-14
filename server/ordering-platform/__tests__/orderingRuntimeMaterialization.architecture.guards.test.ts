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
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".test.tsx")
    ) {
      acc.push(full);
    }
  }
  return acc;
}

describe("ORDERING-RUNTIME-MATERIALIZATION-1 server architecture guards", () => {
  it("registers materializer as sole composition owner", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toContain("ORDERING_PLATFORM_RUNTIME_MATERIALIZER");
    expect(ownership).toContain("OrderingRuntimeMaterializer");
    expect(ownership).toContain("ORDERING_PLATFORM_RUNTIME_MATERIALIZATION_CONTRACT");
  });

  it("exactly one OrderingRuntimeMaterializer class exists on server", () => {
    const serverFiles = collectTsFiles(join(repoRoot, "server"));
    const materializers = serverFiles.filter((file) => {
      const src = readFileSync(file, "utf8");
      return /class\s+OrderingRuntimeMaterializer\b/.test(src);
    });
    expect(materializers).toHaveLength(1);
    expect(materializers[0].replace(/\\/g, "/")).toMatch(
      /ordering-platform\/OrderingRuntimeMaterializer\.ts$/
    );
  });

  it("factory performs construction only — no source composition or UUID generation", () => {
    const factory = read("server/ordering-platform/OrderingRuntimeContextFactory.ts");
    expect(factory).toContain("class OrderingRuntimeContextFactory");
    expect(factory).toContain("freezeOrderingRuntimeContext");
    expect(factory).not.toContain("OrderingRuntimeMaterializationRequest");
    expect(factory).not.toContain("randomUUID");
    expect(factory).not.toContain("channelPolicies");
    expect(factory).not.toContain("CURRENCY_MISMATCH");
    expect(factory).not.toMatch(/\?\? \[\]/);
  });

  it("materializer owns composition and calls factory", () => {
    const materializer = read("server/ordering-platform/OrderingRuntimeMaterializer.ts");
    expect(materializer).toContain("validateSources");
    expect(materializer).toContain("normalizeAndCompose");
    expect(materializer).toContain("this.factory.create");
    expect(materializer).toContain("CURRENCY_MISMATCH");
  });

  it("repositories do not compose ordering runtime", () => {
    const db = read("server/db.ts");
    expect(db).not.toContain("OrderingRuntimeMaterializer");
    expect(db).not.toContain("OrderingRuntimeContextFactory");
    expect(db).not.toContain("OrderingRuntimeContext");
  });

  it("platform concerns include materialization ownership", () => {
    const contracts = read("shared/ordering-platform/orderingPlatformContracts.ts");
    expect(contracts).toContain('"ordering_runtime_materialization"');
  });
});
