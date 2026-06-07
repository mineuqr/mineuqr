import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getRestaurantById: vi.fn(),
}));

vi.mock("./getCommercialEntitlements", () => ({
  getCommercialEntitlements: vi.fn(),
}));

import { getRestaurantById } from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";
import { resolveGuestOrderingAllowed } from "./guestOrderingAuthority";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

describe("resolveGuestOrderingAllowed (ASN-5 Wave A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows ordering when account entitlements grant features.ordering", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      entitlements: { plan: "PROFESSIONAL", features: { ordering: true } },
    });

    const result = await resolveGuestOrderingAllowed(10, FIXED_NOW);

    expect(result.canOrder).toBe(true);
    expect(getCommercialEntitlements).toHaveBeenCalledWith(5, FIXED_NOW);
  });

  it("denies ordering when features.ordering is false", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      entitlements: { plan: "BASIC", features: { ordering: false } },
    });

    expect((await resolveGuestOrderingAllowed(10, FIXED_NOW)).canOrder).toBe(false);
  });

  it("denies ordering when plan is NONE", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      entitlements: { plan: "NONE", features: { ordering: false } },
    });

    expect((await resolveGuestOrderingAllowed(10, FIXED_NOW)).canOrder).toBe(false);
  });

  it("returns false when restaurant not found", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    expect((await resolveGuestOrderingAllowed(999, FIXED_NOW)).canOrder).toBe(false);
    expect(getCommercialEntitlements).not.toHaveBeenCalled();
  });
});
