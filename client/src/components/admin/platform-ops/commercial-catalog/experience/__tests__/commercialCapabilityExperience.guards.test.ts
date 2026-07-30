/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1 — UX adoption guards (presentation only).
 * COMMERCIAL-CATALOG-RATIONALIZATION-1 — rationalized commercial cards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  countEnabledCapabilities,
  groupCapabilitiesByExperienceDomain,
  listCapabilityExperienceCards,
  listComparisonExperienceCards,
  resolveLifecycleStage,
} from "../capabilityExperienceModel";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CAPABILITY-EXPERIENCE-1", () => {
  it("groups rationalized commercial capabilities by experience domain", () => {
    const cards = listCapabilityExperienceCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((c) => c.presentationId === "expo")).toBe(false);
    expect(cards.some((c) => c.presentationId === "financialSettlement")).toBe(
      true
    );
    expect(cards.some((c) => c.presentationId === "sessionTableManagement")).toBe(
      true
    );
    const groups = groupCapabilitiesByExperienceDomain(cards);
    expect(groups.every((g) => g.capabilities.length > 0)).toBe(true);
    expect(groups.some((g) => g.domainId === "orders")).toBe(true);
    const features = {
      ordering: true,
      reporting: true,
      checkManagement: true,
      splitPayment: true,
      multiCheckAllocation: true,
      refund: true,
      printing: true,
      realtime: true,
    };
    const counts = countEnabledCapabilities(features);
    expect(counts.total).toBe(listComparisonExperienceCards().length);
    expect(counts.enabled).toBeGreaterThanOrEqual(2);
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
    expect(wizard).toContain("CapabilityFilterPicker");
    const picker = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/CapabilityFilterPicker.tsx"
    );
    expect(picker).toContain("COMMERCIAL-CATALOG-RATIONALIZATION-1");
  });
});
