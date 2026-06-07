import { describe, expect, it } from "vitest";
import { commercialEntitlementsQueryEnabled } from "@/lib/commercial/entitlementsDisplay";

/**
 * Hook wiring is validated via query-enabled rules (no RTL in project).
 * Integration with trpc.commercial.getEntitlements is covered by server tests (PG-1C.2E).
 */
describe("useCommercialEntitlements query gating", () => {
  it("matches loading prerequisites for authenticated owners", () => {
    expect(commercialEntitlementsQueryEnabled(true, true)).toBe(true);
  });

  it("stays disabled while auth is pending (loading state path)", () => {
    expect(commercialEntitlementsQueryEnabled(false, false)).toBe(false);
    expect(commercialEntitlementsQueryEnabled(false, true)).toBe(false);
  });

  it("stays disabled for guests", () => {
    expect(commercialEntitlementsQueryEnabled(true, false)).toBe(false);
  });
});
