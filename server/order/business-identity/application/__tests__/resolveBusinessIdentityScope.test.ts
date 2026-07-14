import { describe, expect, it } from "vitest";
import {
  businessIdentityScopeCode,
  resolveBusinessIdentityScope,
} from "../resolveBusinessIdentityScope";

describe("resolveBusinessIdentityScope", () => {
  it("maps table fulfilment to TABLE", () => {
    expect(
      resolveBusinessIdentityScope({
        fulfilmentAnchorType: "table",
        serviceMode: "table_service",
      })
    ).toBe("TABLE");
  });

  it("maps station / counter fulfilment to KIOSK", () => {
    expect(
      resolveBusinessIdentityScope({
        fulfilmentAnchorType: "station",
        serviceMode: "counter",
      })
    ).toBe("KIOSK");
  });

  it("honors explicit persisted identityScope", () => {
    expect(
      resolveBusinessIdentityScope({
        identityScope: "kiosk",
        fulfilmentAnchorType: "table",
      })
    ).toBe("KIOSK");
  });

  it("defaults historic rows without stamps to TABLE", () => {
    expect(resolveBusinessIdentityScope({})).toBe("TABLE");
  });

  it("maps scope codes for display formatting", () => {
    expect(businessIdentityScopeCode("TABLE")).toBe("T");
    expect(businessIdentityScopeCode("KIOSK")).toBe("K");
  });
});
