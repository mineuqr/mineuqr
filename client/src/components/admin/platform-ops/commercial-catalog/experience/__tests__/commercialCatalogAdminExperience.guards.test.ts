/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toSmartValidationActions, uniqueSlug } from "../smartValidation";
import {
  diffFeatureSets,
  diffScalar,
  summarizeDiffs,
} from "../versionCompare";
import {
  analyzeNodeImpact,
  buildVersionDependencyGraph,
} from "../dependencyGraph";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1", () => {
  it("wires experience shell into Catalog composition", () => {
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
    );
    expect(composition).toContain("COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1");
    expect(composition).toContain("PlanCreationWizard");
    expect(composition).toContain("GlobalCatalogSearch");
    expect(composition).toContain("VersionComparePanel");
    expect(composition).toContain("DeepClonePanel");
    expect(composition).toContain("PricingPreviewPanel");
    expect(composition).toContain("CustomerPreviewPanel");
    expect(composition).toContain("DependencyGraphPanel");
    expect(composition).toContain("PublicationDiffPanel");
    expect(composition).toContain("BulkOperationsPanel");
    expect(composition).toContain("CommercialTimelinePanel");
    expect(composition).toContain("SmartValidationEnhancer");
    expect(composition).not.toMatch(/getDb\(|drizzle-orm/i);
  });

  it("maps CC-16 issues to actionable smart validation", () => {
    const actions = toSmartValidationActions([
      {
        code: "pricing_exists",
        message: "Pricing must exist before publication",
        field: "prices",
      },
      {
        code: "feature_bundle_exists",
        message: "Feature Bundle must exist",
        field: "featureBundleId",
      },
    ]);
    expect(actions[0]?.titleKey).toBe("validation.pricingExists.title");
    expect(actions[0]?.navigateTo).toBe("pricing");
    expect(actions[1]?.ctaKey).toBe("validation.featureBundleExists.cta");
    expect(uniqueSlug("basic")).toMatch(/^basic-copy-/);
  });

  it("computes version diffs and dependency impact", () => {
    const features = diffFeatureSets(["ordering"], ["ordering", "reports"]);
    expect(summarizeDiffs(features).added).toBe(1);
    expect(diffScalar("a", 1, 2).kind).toBe("modified");

    const graph = buildVersionDependencyGraph({
      plan: { id: "p1", name: "Pro" },
      version: { id: "v1", versionName: "v1", state: "draft" },
      prices: [
        {
          id: "pr1",
          amount: "99",
          currency: "SAR",
          billingCycleId: "c1",
        },
      ],
      cycles: [{ id: "c1", name: "Monthly" }],
      bundle: { id: "b1", name: "Bundle" },
      limits: { id: "l1", name: "Limits" },
      trial: null,
      regions: [],
      promotions: [],
      migration: { id: "m1", name: "Mig" },
      retirement: { id: "r1", name: "Ret" },
      blockers: ["pricing_exists"],
    });
    expect(graph.nodes.length).toBeGreaterThan(3);
    const impact = analyzeNodeImpact(
      "version:v1",
      graph.edges,
      ["missing price"]
    );
    expect(impact.blockers).toEqual(["missing price"]);
    expect(impact.dependencies.length).toBeGreaterThan(0);
  });

  it("wizard orchestrates existing tRPC mutations only", () => {
    const wizard = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx"
    );
    expect(wizard).toContain("validatePublication");
    expect(wizard).toContain("useCatalogPublishingMutations");
    expect(wizard).toContain("publishVersion");
    expect(wizard).toContain("createPlan");
    expect(wizard).not.toMatch(/commercialCatalog\.publishVersion\.useMutation/);
    expect(wizard).not.toMatch(/skipValidation/i);
    expect(wizard).toContain("validation.publishRequiresCc16Detail");
  });
});
