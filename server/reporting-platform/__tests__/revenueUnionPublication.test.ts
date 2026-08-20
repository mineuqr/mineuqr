import { describe, expect, it } from "vitest";
import { resolveRevenueUnionPublicationMode } from "../revenueUnionPublication";

describe("resolveRevenueUnionPublicationMode", () => {
  it("defaults to published Union pipeline", () => {
    expect(resolveRevenueUnionPublicationMode({})).toBe("published");
  });

  it("accepts legacy rollback without treating unknown values as a second root", () => {
    expect(
      resolveRevenueUnionPublicationMode({ REPORTING_REVENUE_UNION: "legacy" })
    ).toBe("legacy");
    expect(
      resolveRevenueUnionPublicationMode({
        REPORTING_REVENUE_UNION: "dual-publish",
      })
    ).toBe("published");
  });
});
