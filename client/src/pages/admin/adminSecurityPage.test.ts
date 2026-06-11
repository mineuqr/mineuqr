import { describe, expect, it } from "vitest";
import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import {
  SECURITY_CENTER_SECTIONS,
  SECURITY_ASSET_DEFINITIONS,
} from "@/lib/admin/domains/security/securityDomain";
import { getAdminRoute } from "@/lib/admin/routes/adminRouteRegistry";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import AdminSecurityPage from "./AdminSecurityPage";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe("AdminSecurityPage route and shell", () => {
  it("registers /admin/security route", () => {
    const route = getAdminRoute("security");
    expect(route.path).toBe("/admin/security");
    expect(route.showInNav).not.toBe(false);
  });

  it("exports a page component (not placeholder)", () => {
    expect(typeof AdminSecurityPage).toBe("function");
    expect(AdminSecurityPage.name).toBe("AdminSecurityPage");
  });

  it("defines PR-7 Security Center sections only", () => {
    expect(SECURITY_CENTER_SECTIONS).toEqual([
      "SecurityOverviewSection",
      "SecurityHealthSection",
      "SecurityWarningsSection",
      "SecurityProtectedAccountsSection",
    ]);
  });

  it("registers PR-7 security center assets", () => {
    const ids = SECURITY_ASSET_DEFINITIONS.map((asset) => asset.id);
    expect(ids).toContain("security-center-composition");
    expect(ids).toContain("security-overview");
    expect(ids).toContain("security-health");
    expect(ids).toContain("api-get-audit-event-stats");
    expect(ids).toContain("api-get-security-health");
  });
});

describe("AdminSecurityPage access gating", () => {
  it("enables admin queries only for authenticated admins", () => {
    expect(adminQueriesEnabled(false, true, true)).toBe(true);
    expect(adminQueriesEnabled(true, true, true)).toBe(false);
    expect(adminQueriesEnabled(false, false, false)).toBe(false);
    expect(adminQueriesEnabled(false, true, false)).toBe(false);
  });
});

describe("AdminSecurityPage i18n", () => {
  it("has matching admin.security keys in en and ar", () => {
    const enKeys = flattenKeys(
      (en.admin as Record<string, unknown>).security as Record<string, unknown>
    ).sort();
    const arKeys = flattenKeys(
      (ar.admin as Record<string, unknown>).security as Record<string, unknown>
    ).sort();

    expect(enKeys).toEqual(arKeys);
    expect(enKeys).toContain("overview.basedOnLast7Days");
    expect(enKeys).toContain("health.status.healthy");
    expect(enKeys).toContain("warnings.emptyTitle");
    expect(enKeys).toContain("protected.platformUserId");
  });
});
