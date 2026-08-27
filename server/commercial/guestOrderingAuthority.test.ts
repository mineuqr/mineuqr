import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getRestaurantById: vi.fn(),
}));

vi.mock("../subscription-runtime", () => ({
  hasFeature: vi.fn(),
}));

import { getRestaurantById } from "../db";
import { hasFeature } from "../subscription-runtime";
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
    (hasFeature as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await resolveGuestOrderingAllowed(10, FIXED_NOW);

    expect(result.canOrder).toBe(true);
    expect(hasFeature).toHaveBeenCalledWith(5, "ordering", FIXED_NOW);
  });

  it("denies ordering when features.ordering is false", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (hasFeature as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    expect((await resolveGuestOrderingAllowed(10, FIXED_NOW)).canOrder).toBe(false);
  });

  it("denies ordering when plan is NONE", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (hasFeature as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    expect((await resolveGuestOrderingAllowed(10, FIXED_NOW)).canOrder).toBe(false);
  });

  it("returns false when restaurant not found", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    expect((await resolveGuestOrderingAllowed(999, FIXED_NOW)).canOrder).toBe(false);
    expect(hasFeature).not.toHaveBeenCalled();
  });

  it("reuses a same-request restaurant and still enforces hasFeature", async () => {
    (hasFeature as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await resolveGuestOrderingAllowed(10, FIXED_NOW, {
      id: 10,
      userId: 5,
    });

    expect(result.canOrder).toBe(true);
    expect(getRestaurantById).not.toHaveBeenCalled();
    expect(hasFeature).toHaveBeenCalledWith(5, "ordering", FIXED_NOW);
  });

  it("reloads when the preloaded restaurant id does not match", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (hasFeature as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await resolveGuestOrderingAllowed(10, FIXED_NOW, {
      id: 99,
      userId: 5,
    });

    expect(result.canOrder).toBe(false);
    expect(getRestaurantById).toHaveBeenCalledWith(10);
    expect(hasFeature).toHaveBeenCalledWith(5, "ordering", FIXED_NOW);
  });

  it("reloads when the preloaded restaurant has no owner id", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (hasFeature as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await resolveGuestOrderingAllowed(10, FIXED_NOW, { id: 10 });

    expect(result.canOrder).toBe(true);
    expect(getRestaurantById).toHaveBeenCalledWith(10);
    expect(hasFeature).toHaveBeenCalledWith(5, "ordering", FIXED_NOW);
  });

  it("denies when restaurant has no owner", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
    });

    expect((await resolveGuestOrderingAllowed(10, FIXED_NOW)).canOrder).toBe(false);
    expect(hasFeature).not.toHaveBeenCalled();
  });
});
