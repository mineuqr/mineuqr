/**
 * COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1 — restaurant row lock unit tests.
 */
import { describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import {
  lockRestaurantRowForUpdate,
  requireRestaurantRowForUpdate,
  RestaurantGoneError,
} from "../restaurantRowLock";

describe("restaurantRowLock", () => {
  it("returns the locked parent row", async () => {
    const execute = vi.fn().mockResolvedValue([[{ id: 41, userId: 9 }]]);
    const row = await lockRestaurantRowForUpdate({ execute }, 41);
    expect(row).toEqual({ id: 41, userId: 9 });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("returns null when the restaurant row is gone", async () => {
    const execute = vi.fn().mockResolvedValue([[]]);
    await expect(lockRestaurantRowForUpdate({ execute }, 41)).resolves.toBeNull();
  });

  it("require throws RestaurantGoneError when missing", async () => {
    const execute = vi.fn().mockResolvedValue([[]]);
    await expect(requireRestaurantRowForUpdate({ execute }, 77)).rejects.toMatchObject({
      name: "RestaurantGoneError",
      code: "RESTAURANT_GONE",
      restaurantId: 77,
    });
    expect(RestaurantGoneError).toBeDefined();
  });
});
