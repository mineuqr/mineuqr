import { describe, expect, it } from "vitest";
import {
  BUSINESS_IDENTITY_RETRY_POLICY,
  computeBusinessIdentityRetryDelayMs,
} from "../../config/businessIdentityRetryPolicy";

describe("businessIdentityRetryPolicy", () => {
  it("uses centralized bounded exponential backoff", () => {
    expect(BUSINESS_IDENTITY_RETRY_POLICY.maxAttempts).toBe(5);
    expect(computeBusinessIdentityRetryDelayMs(1)).toBe(25);
    expect(computeBusinessIdentityRetryDelayMs(2)).toBe(50);
    expect(computeBusinessIdentityRetryDelayMs(3)).toBe(100);
    expect(computeBusinessIdentityRetryDelayMs(10)).toBe(
      BUSINESS_IDENTITY_RETRY_POLICY.maxDelayMs
    );
  });
});
