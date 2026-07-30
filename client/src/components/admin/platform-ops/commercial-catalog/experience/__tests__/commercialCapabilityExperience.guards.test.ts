/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1 — UX adoption guards (presentation only).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMMERCIAL_CAPABILITY_FILTER_KEYS } from "@shared/commercial-capability";
import {
  countEnabledCapabilities,
  groupCapabilitiesByExperienceDomain,
  listCapabilityExperienceCards,
  resolveLifecycleStage,
} from "../capabilityExperienceModel";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CAPABILITY-EXPERIENCE-1", () => {
  it("groups registry capabilities by experience domain without mutating registry", () => {
    const cards = listCapabilityExperienceCards();
    expect(cards.length).toBe(COMMERCIAL_CAPABILITY_FILTER_KEYS.length);
    const groups = groupCapabilitiesByExperienceDomain(cards);
    expect(groups.every((g) => g.capabilities.length > 0)).toBe(true);
    expect(groups.some((g) => g.domainId === "orders")).toBe(true);
    const counts = countEnabledCapabilities({ ordering: true, reporting: true });
    expect(counts.total).toBe(COMMERCIAL_CAPABILITY_FILTER_KEYS.length);
    expect(counts.enabled).toBe(2);
    expect(counts.disabled).toBe(COMMERCIAL_CAPABILITY_FILTER_KEYS.length - 2);
  });

  it("resolves publish lifecycle stages for UX rail", () => {
    expect(
      resolveLifecycleStage({ foundationState: "draft", workflowState: "approved" })
    ).toBe("approved");
    expect(
      resolveLifecycleStage({
        foundationState: "published",
        workflowState: "published",
      })
    ).toBe("published");
    expect(
      resolveLifecycleStage({ foundationState: "retired", workflowState: "archived" })
    ).toBe("archived");
  });

  it("replaces legacy checkbox grids with CapabilityFilterPicker", () => {
    const wizard = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx"
    );
    const panels = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    expect(wizard).toContain("CapabilityFilterPicker");
    expect(wizard).toContain("CapabilityPricingPreview");
    expect(wizard).toContain("CapabilityLifecycleRail");
    expect(wizard).not.toMatch(
      /grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded border p-2/
    );
    expect(panels).toContain("CapabilityFilterPicker");
    expect(panels).toContain("CapabilityLifecycleRail");
    expect(panels).not.toMatch(
      /CATALOG_FEATURE_KEYS\.map\(\(key\) => \(\s*<label/
    );
  });

  it("does not change Catalog / Runtime / Billing modules", () => {
    const picker = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/CapabilityFilterPicker.tsx"
    );
    expect(picker).toContain("COMMERCIAL-CAPABILITY-EXPERIENCE-1");
    expect(picker).not.toMatch(/createFeatureBundle|publishVersion|hasFeature/);
    expect(picker).not.toMatch(/subscription-runtime|drizzle|getDb/);

    const model = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/capabilityExperienceModel.ts"
    );
    expect(model).toContain("@shared/commercial-capability");
    expect(model).not.toMatch(/FEATURE_KEYS\s*=/);
  });

  it("Pricing preview uses capability-grouped public card", () => {
    const experience = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/ExperiencePanels.tsx"
    );
    expect(experience).toContain("CapabilityPricingPreview");
  });

  it("locales include capability experience copy (en + ar)", () => {
    const en = read("client/src/locales/en.json");
    const ar = read("client/src/locales/ar.json");
    expect(en).toContain('"capabilityExperience"');
    expect(ar).toContain('"capabilityExperience"');
    expect(en).toContain("filterMetaphor");
    expect(ar).toContain("filterMetaphor");
  });
});
