/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const FACADE_TARGETS = [
  "client/src/components/dashboard/RestaurantSectionStates.tsx",
  "client/src/components/admin/operations/AdminEmptyState.tsx",
  "client/src/components/admin/operations/AdminLoadingState.tsx",
  "client/src/components/app-state/AppEmptyState.tsx",
  "client/src/components/app-state/AppErrorState.tsx",
  "client/src/components/app-state/AppLoadingState.tsx",
  "client/src/components/admin/domains/security/SecuritySectionStates.tsx",
] as const;

const DIRECT_MIGRATION_TARGETS = [
  "client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx",
  "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx",
] as const;

const PLATFORM_PRIMITIVES = [
  "SemanticSectionState",
  "SemanticLoadingState",
  "SemanticSkeletonState",
  "SemanticEmptyState",
  "SemanticErrorState",
  "SemanticSuccessState",
  "SemanticOfflineState",
  "SemanticRetrySlot",
  "SemanticStateIllustration",
  "SemanticStateActions",
] as const;

describe("SEMANTIC-SECTION-STATE-PLATFORM-1", () => {
  it("exports Section State platform primitives", () => {
    const barrel = read(
      "client/src/design-system/semantic-section-state/index.ts"
    );
    for (const name of PLATFORM_PRIMITIVES) {
      expect(barrel).toContain(name);
    }
    expect(
      existsSync(
        resolve(
          root,
          "client/src/design-system/semantic-section-state/components/SemanticSectionState.tsx"
        )
      )
    ).toBe(true);
    expect(read("client/src/design-system/index.ts")).toContain(
      "semantic-section-state"
    );
  });

  it("section-state chrome is presentation-only (no domain/API ownership)", () => {
    const files = [
      "client/src/design-system/semantic-section-state/components/SemanticSectionState.tsx",
      "client/src/design-system/semantic-section-state/components/SemanticEmptyState.tsx",
      "client/src/design-system/semantic-section-state/components/SemanticErrorState.tsx",
      "client/src/design-system/semantic-section-state/components/SemanticLoadingState.tsx",
      "client/src/design-system/semantic-section-state/components/SemanticStateSlots.tsx",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toContain("trpc.");
      expect(src).not.toContain("mutate(");
      expect(src).not.toContain("useQuery");
      expect(src).not.toContain("useMutation");
      expect(src).not.toContain("refetch(");
    }
  });

  it("legacy section facades adopt the platform", () => {
    for (const rel of FACADE_TARGETS) {
      const src = read(rel);
      expect(src).toMatch(
        /semantic-section-state|SemanticEmptyState|SemanticErrorState|SemanticLoadingState|SemanticSkeletonState/
      );
    }
  });

  it("direct workspace migrations use platform primitives", () => {
    for (const rel of DIRECT_MIGRATION_TARGETS) {
      const src = read(rel);
      expect(src).toContain("SemanticEmptyState");
      expect(src).toContain("SemanticLoadingState");
    }
  });

  it("semantic-card empty/skeletons re-home to section-state platform", () => {
    const empty = read(
      "client/src/design-system/semantic-card/components/SemanticEmptyState.tsx"
    );
    const skeleton = read(
      "client/src/design-system/semantic-card/components/SemanticSkeleton.tsx"
    );
    expect(empty).toContain("semantic-section-state");
    expect(skeleton).toContain("semantic-section-state");
  });

  it("operational / kitchen / auth states remain feature-owned", () => {
    const kitchen = read(
      "client/src/components/operational-screen/KitchenOperationalStates.tsx"
    );
    expect(kitchen).not.toContain("SemanticSectionState");
    expect(kitchen).not.toContain(
      'from "@/design-system/semantic-section-state"'
    );

    const boot = read(
      "client/src/components/operational-screen/pairing/ScreenBootLoadingPanel.tsx"
    );
    expect(boot).not.toContain(
      'from "@/design-system/semantic-section-state"'
    );

    const settings = read(
      "client/src/components/screen-management/ScreenSettingsSheet.tsx"
    );
    expect(settings).not.toContain("SemanticEmptyState");
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/SEMANTIC-SECTION-STATE-PLATFORM-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
