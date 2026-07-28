/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEMANTIC_BADGE_TONES,
  mapOrderStatusToBadgeTone,
  mapCommercialStatusToBadgeTone,
  resolveBadgeBaseTone,
  semanticBadgeToneClass,
} from "@/design-system/semantic-badge";
import { SEMANTIC_TONE } from "@/design-system/semantic-card";

describe("SEMANTIC-STATUS-BADGE-SYSTEM-1", () => {
  it("badge soft density uses SEMANTIC_TONE.badge for base tones", () => {
    expect(semanticBadgeToneClass("success", "soft")).toBe(
      SEMANTIC_TONE.badge.success
    );
    expect(semanticBadgeToneClass("danger", "soft")).toBe(
      SEMANTIC_TONE.badge.danger
    );
  });

  it("lifecycle tones resolve to base color families", () => {
    expect(resolveBadgeBaseTone("pending")).toBe("warning");
    expect(resolveBadgeBaseTone("processing")).toBe("info");
    expect(resolveBadgeBaseTone("completed")).toBe("success");
    expect(resolveBadgeBaseTone("cancelled")).toBe("danger");
    expect(resolveBadgeBaseTone("refunded")).toBe("danger");
    expect(resolveBadgeBaseTone("archived")).toBe("neutral");
  });

  it("order status mapper covers Order Platform statuses", () => {
    expect(mapOrderStatusToBadgeTone("pending")).toBe("pending");
    expect(mapOrderStatusToBadgeTone("preparing")).toBe("processing");
    expect(mapOrderStatusToBadgeTone("ready")).toBe("completed");
    expect(mapOrderStatusToBadgeTone("served")).toBe("archived");
    expect(mapOrderStatusToBadgeTone("cancelled")).toBe("cancelled");
  });

  it("commercial status mapper covers commercial presentation states", () => {
    expect(mapCommercialStatusToBadgeTone("active")).toBe("success");
    expect(mapCommercialStatusToBadgeTone("trial")).toBe("info");
    expect(mapCommercialStatusToBadgeTone("expired")).toBe("danger");
  });

  it("tone registry is complete", () => {
    expect(SEMANTIC_BADGE_TONES.length).toBeGreaterThanOrEqual(14);
  });

  it("CommercialStatusBadge has no local STATUS_STYLES map", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/admin/commercial/CommercialStatusBadge.tsx"
      ),
      "utf8"
    );
    expect(src).not.toContain("STATUS_STYLES");
    expect(src).toContain("SemanticBadge");
  });

  it("RegisterStatusBadges has no local dutyClass map", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/register-operations/RegisterStatusBadges.tsx"
      ),
      "utf8"
    );
    expect(src).not.toContain("dutyClass");
    expect(src).toContain("SemanticBadge");
  });

  it("DiningSessionOrdersList has no local statusColors map", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/dashboard/DiningSessionOrdersList.tsx"
      ),
      "utf8"
    );
    expect(src).not.toContain("statusColors");
    expect(src).toContain("OperationalOrderStatus");
  });

  it("HealthStatusBadge has no local TONE_CLASS map", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/print-workspace/HealthStatusBadge.tsx"
      ),
      "utf8"
    );
    expect(src).not.toContain("TONE_CLASS");
    expect(src).toContain("mapHealthToneToBadgeTone");
  });
});
