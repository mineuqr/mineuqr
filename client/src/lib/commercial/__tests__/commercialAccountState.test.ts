/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1 — login redirect + route helper.
 */
import { describe, expect, it } from "vitest";
import {
  FROZEN_RENEWAL_PATH,
  isCommercialManagementPath,
  isFrozenCommercialAccount,
  resolvePostAuthPath,
} from "../commercialAccountState";

describe("commercial account state client helpers", () => {
  it("reads FROZEN from entitlement meta only", () => {
    expect(isFrozenCommercialAccount({ commercialAccountState: "FROZEN" })).toBe(true);
    expect(isFrozenCommercialAccount({ commercialAccountState: "ACTIVE" })).toBe(false);
    expect(isFrozenCommercialAccount({ commercialAccountState: "NONE" })).toBe(false);
    expect(isFrozenCommercialAccount(null)).toBe(false);
  });

  it("classifies protected commercial management paths", () => {
    expect(isCommercialManagementPath("/dashboard")).toBe(true);
    expect(isCommercialManagementPath("/dashboard/menu")).toBe(true);
    expect(isCommercialManagementPath("/dashboard/templates/9")).toBe(true);
    expect(isCommercialManagementPath("/statistics")).toBe(true);
    expect(isCommercialManagementPath("/pricing")).toBe(false);
    expect(isCommercialManagementPath("/subscription")).toBe(false);
    expect(isCommercialManagementPath("/login")).toBe(false);
  });

  it("sends a FROZEN login to Plans instead of Dashboard", () => {
    expect(
      resolvePostAuthPath({
        accountState: "FROZEN",
        requestedPath: "/dashboard",
      })
    ).toBe(FROZEN_RENEWAL_PATH);
    expect(
      resolvePostAuthPath({
        accountState: "FROZEN",
        requestedPath: "/dashboard/screens",
      })
    ).toBe(FROZEN_RENEWAL_PATH);
  });

  it("lets ACTIVE customers continue to the requested commercial path", () => {
    expect(
      resolvePostAuthPath({
        accountState: "ACTIVE",
        requestedPath: "/dashboard",
      })
    ).toBe("/dashboard");
  });

  it("still allows a FROZEN customer to reach Plans / subscription", () => {
    expect(
      resolvePostAuthPath({
        accountState: "FROZEN",
        requestedPath: "/pricing",
      })
    ).toBe("/pricing");
    expect(
      resolvePostAuthPath({
        accountState: "FROZEN",
        requestedPath: "/subscription",
      })
    ).toBe("/subscription");
  });
});
