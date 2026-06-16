import { describe, expect, it } from "vitest";
import {
  isTrackingExpired,
  parseOrderTimestamp,
  TRACKING_EXPIRY_AFTER_READY_MS,
} from "./orderTrackingExpiry";

describe("orderTrackingExpiry TRACKING-EXPIRY-1", () => {
  const readyAt = "2026-06-12 10:00:00";
  const readyMs = parseOrderTimestamp(readyAt);

  it("returns false when readyAt is null", () => {
    expect(isTrackingExpired(null)).toBe(false);
    expect(isTrackingExpired(undefined)).toBe(false);
  });

  it("returns false before 12 minutes after readyAt", () => {
    expect(isTrackingExpired(readyAt, readyMs + TRACKING_EXPIRY_AFTER_READY_MS - 1)).toBe(
      false
    );
    expect(isTrackingExpired(readyAt, readyMs + 11 * 60 * 1000)).toBe(false);
  });

  it("returns true after 12 minutes after readyAt", () => {
    expect(isTrackingExpired(readyAt, readyMs + TRACKING_EXPIRY_AFTER_READY_MS + 1)).toBe(
      true
    );
    expect(isTrackingExpired(readyAt, readyMs + 13 * 60 * 1000)).toBe(true);
  });
});
