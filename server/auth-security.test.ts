import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  clearRateLimit,
  _resetRateLimitStoreForTests,
} from "./_core/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
  });

  it("allows requests under the limit", () => {
    const opts = { windowMs: 60_000, maxAttempts: 3 };
    expect(checkRateLimit("test-key", opts).allowed).toBe(true);
    expect(checkRateLimit("test-key", opts).allowed).toBe(true);
    expect(checkRateLimit("test-key", opts).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const opts = { windowMs: 60_000, maxAttempts: 2 };
    checkRateLimit("block-key", opts);
    checkRateLimit("block-key", opts);
    const third = checkRateLimit("block-key", opts);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("clears bucket on successful login path", () => {
    const opts = { windowMs: 60_000, maxAttempts: 1 };
    checkRateLimit("login-key", opts);
    expect(checkRateLimit("login-key", opts).allowed).toBe(false);
    clearRateLimit("login-key");
    expect(checkRateLimit("login-key", opts).allowed).toBe(true);
  });
});
