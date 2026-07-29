/**
 * SUBSCRIPTION-PLATFORM-UI-FOUNDATION-1 — architecture / presentation guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SUBSCRIPTION_ARCHITECTURE_PRINCIPLES,
  SUBSCRIPTION_DASHBOARD_HOST_PATH,
  SUBSCRIPTION_PLACEHOLDER_SECTIONS,
  SUBSCRIPTION_PLATFORM_DOES_NOT_OWN,
  SUBSCRIPTION_PLATFORM_OWNS,
  SUBSCRIPTION_PLATFORM_UI_PROGRAM,
  SUBSCRIPTION_UI_STATUS_LABELS,
} from "@shared/subscription-platform";
import { getPlatformOpsSection } from "@/lib/admin/platform-ops/platformOpsSections";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("SUBSCRIPTION-PLATFORM-UI-FOUNDATION-1", () => {
  it("declares program identity, ownership, and principles", () => {
    expect(SUBSCRIPTION_PLATFORM_UI_PROGRAM).toBe(
      "SUBSCRIPTION-PLATFORM-UI-FOUNDATION-1"
    );
    expect(SUBSCRIPTION_ARCHITECTURE_PRINCIPLES).toEqual(
      expect.arrayContaining([
        "plans_are_presentation",
        "features_are_contracts",
        "no_billing_in_ui_foundation",
        "no_entitlement_engine",
        "read_only_placeholders",
        "honest_architecture_status",
        "platform_ops_ui_reuse",
      ])
    );
    expect(SUBSCRIPTION_PLATFORM_DOES_NOT_OWN).toEqual(
      expect.arrayContaining([
        "billing",
        "payments",
        "entitlement_evaluation_runtime",
        "rbac",
        "tenant_identity",
        "database_schema",
      ])
    );
    expect(SUBSCRIPTION_PLATFORM_OWNS.length).toBeGreaterThan(0);
  });

  it("exposes required read-only placeholder sections with honest status", () => {
    const ids = SUBSCRIPTION_PLACEHOLDER_SECTIONS.map((s) => s.id);
    expect(ids).toEqual([
      "plans",
      "feature_catalog",
      "entitlements",
      "limits",
      "trials",
      "commercial_policies",
      "feature_flags",
      "usage",
      "roadmap",
    ]);
    for (const section of SUBSCRIPTION_PLACEHOLDER_SECTIONS) {
      expect(section.readOnly).toBe(true);
      expect(SUBSCRIPTION_UI_STATUS_LABELS).toContain(section.statusLabel);
    }
  });

  it("registers Subscription under Platform Ops as architecture (not live)", () => {
    expect(getPlatformOpsSection("subscription").path).toBe(
      SUBSCRIPTION_DASHBOARD_HOST_PATH
    );
    expect(getPlatformOpsSection("subscription").status).toBe("architecture");
    expect(SUBSCRIPTION_DASHBOARD_HOST_PATH).toBe("/admin/platform/subscription");
  });

  it("wires presentation-only composition and route without trpc/billing", () => {
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsSubscriptionComposition.tsx"
    );
    expect(composition).toContain("@/design-system/platform-ops-ui");
    expect(composition).toContain("@shared/subscription-platform");
    expect(composition).toContain("PlatformOpsMetricCard");
    expect(composition).not.toContain("@/lib/trpc");
    expect(composition).not.toContain("useMutation");
    expect(composition).not.toMatch(/\bstripe\b/i);
    expect(composition).not.toMatch(/chargeCard|createInvoice|paymentGateway/i);

    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/admin/platform/subscription"');
    expect(app).toContain("AdminPlatformOpsSubscriptionPage");

    const pages = read(
      "client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx"
    );
    expect(pages).toContain("PlatformOpsSubscriptionComposition");
  });
});
