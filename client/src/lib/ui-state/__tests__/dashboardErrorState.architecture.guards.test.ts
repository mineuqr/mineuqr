import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listFiles(dirRel: string): string[] {
  const abs = join(repoRoot, dirRel);
  return readdirSync(abs).map((name) => join(dirRel, name).replace(/\\/g, "/"));
}

describe("DASHBOARD-ERROR-STATE-ARCHITECTURE-1 guards", () => {
  it("defines official lifecycle resolver with Error before Empty", () => {
    const resolver = read("client/src/lib/ui-state/resolveAsyncUiState.ts");
    expect(resolver).toContain("Empty must never be inferred before Error");
    expect(resolver).toContain('return "error"');
    expect(resolver).toContain('return "empty"');
    const errorIdx = resolver.indexOf('return "error"');
    const emptyIdx = resolver.indexOf('return "empty"');
    expect(errorIdx).toBeGreaterThan(-1);
    expect(emptyIdx).toBeGreaterThan(errorIdx);
  });

  it("publishes shared App*State components outside Dashboard", () => {
    const index = read("client/src/components/app-state/index.ts");
    expect(index).toContain("AppLoadingState");
    expect(index).toContain("AppEmptyState");
    expect(index).toContain("AppErrorState");
    expect(index).toContain("AppUnauthorizedState");
    expect(index).toContain("AppForbiddenState");

    for (const file of listFiles("client/src/components/app-state")) {
      if (!file.endsWith(".tsx")) continue;
      const src = read(file);
      expect(src).not.toMatch(/from ["']@\/components\/dashboard/);
      expect(src).not.toMatch(/from ["']@\/pages\/Dashboard/);
      expect(src).not.toContain("RestaurantSection");
    }
  });

  it("Dashboard restaurant list evaluates isError before empty presentation", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(dashboard).toContain("resolveAsyncUiState");
    expect(dashboard).toContain("AppErrorState");
    expect(dashboard).toContain("AppEmptyState");
    expect(dashboard).toContain("isError: restaurantsError");
    expect(dashboard).toContain('listPhase === "error"');
    expect(dashboard).toContain('listPhase === "empty"');
    const errorBranch = dashboard.indexOf('listPhase === "error"');
    const emptyBranch = dashboard.indexOf('listPhase === "empty"');
    expect(errorBranch).toBeGreaterThan(-1);
    expect(emptyBranch).toBeGreaterThan(errorBranch);
    // Forbidden anti-pattern from forensics: empty inferred from !length alone
    expect(dashboard).not.toMatch(
      /restaurantsError[\s\S]{0,40}\?[\s\S]{0,80}!restaurants\?\.length/
    );
  });

  it("RestaurantDetail settings bootstrap distinguishes error from not-found", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(dashboard).toContain("detailPhase");
    expect(dashboard).toContain("refetchRestaurant");
    expect(dashboard).toContain('detailPhase === "error"');
    expect(dashboard).toContain("dashboard.restaurantNotFound");
  });

  it("documents React Query policy for the platform", () => {
    const policy = read("client/src/lib/ui-state/reactQueryPolicy.ts");
    expect(policy).toContain("REACT_QUERY_UI_POLICY");
    expect(policy).toContain("never_empty_on_error");
    expect(policy).toContain("isPending");
    expect(policy).toContain("isError");
  });
});
