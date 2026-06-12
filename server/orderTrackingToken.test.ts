import { describe, expect, it } from "vitest";
import { generateOrderTrackingToken } from "./orderTrackingToken";

describe("orderTrackingToken PR-CUX-1A", () => {
  it("generates unique URL-safe tokens", () => {
    const a = generateOrderTrackingToken();
    const b = generateOrderTrackingToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
