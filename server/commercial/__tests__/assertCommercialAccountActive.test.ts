/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1 — API denylist + server FROZEN guard.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("../../subscription-runtime", () => ({
  resolveOwnerEntitlements: vi.fn(),
}));

import { resolveOwnerEntitlements } from "../../subscription-runtime";
import {
  COMMERCIAL_ACCOUNT_FROZEN_CODE,
  assertCommercialAccountActive,
  isFrozenBlockedCommercialMutation,
} from "../assertCommercialAccountActive";

describe("isFrozenBlockedCommercialMutation", () => {
  it("blocks commercial management mutations", () => {
    expect(isFrozenBlockedCommercialMutation("menuItem.create")).toBe(true);
    expect(isFrozenBlockedCommercialMutation("menuItem.update")).toBe(true);
    expect(isFrozenBlockedCommercialMutation("restaurant.updateTemplate")).toBe(true);
    expect(isFrozenBlockedCommercialMutation("restaurant.uploadImage")).toBe(true);
    expect(isFrozenBlockedCommercialMutation("operationalDevice.management.create")).toBe(
      true
    );
    expect(isFrozenBlockedCommercialMutation("operationalDevice.fleet.revoke")).toBe(
      true
    );
    expect(isFrozenBlockedCommercialMutation("printerManagement.create")).toBe(true);
    expect(isFrozenBlockedCommercialMutation("order.updateStatus")).toBe(true);
  });

  it("does not block renewal, billing, entitlements, or auth", () => {
    expect(isFrozenBlockedCommercialMutation("subscription.createCheckoutSession")).toBe(
      false
    );
    expect(isFrozenBlockedCommercialMutation("subscription.createTapCheckout")).toBe(
      false
    );
    expect(isFrozenBlockedCommercialMutation("commercial.getEntitlements")).toBe(false);
    expect(isFrozenBlockedCommercialMutation("invoice.list")).toBe(false);
    expect(isFrozenBlockedCommercialMutation("auth.me")).toBe(false);
    expect(isFrozenBlockedCommercialMutation("ownerAccess.getMode")).toBe(false);
  });
});

describe("assertCommercialAccountActive", () => {
  beforeEach(() => {
    vi.mocked(resolveOwnerEntitlements).mockReset();
  });

  it("allows ACTIVE accounts", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue({
      meta: { commercialAccountState: "ACTIVE" },
    } as never);
    await expect(assertCommercialAccountActive(7)).resolves.toBeUndefined();
  });

  it("denies FROZEN accounts with a stable cause code", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue({
      meta: { commercialAccountState: "FROZEN" },
    } as never);
    try {
      await assertCommercialAccountActive(7);
      throw new Error("expected FORBIDDEN");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
      expect(
        (err as TRPCError & { cause?: Error & { code?: string } }).cause?.code
      ).toBe(COMMERCIAL_ACCOUNT_FROZEN_CODE);
    }
  });

  it("fail-closes when the hub cannot resolve", async () => {
    vi.mocked(resolveOwnerEntitlements).mockRejectedValue(new Error("db down"));
    await expect(assertCommercialAccountActive(7)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
