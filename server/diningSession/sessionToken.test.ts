import { describe, expect, it } from "vitest";
import { generateDiningSessionToken } from "./sessionToken";

describe("generateDiningSessionToken TABLE-MANAGEMENT-1 D2", () => {
  it("generates unique URL-safe tokens with trackingToken-level entropy", () => {
    const a = generateDiningSessionToken();
    const b = generateDiningSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
