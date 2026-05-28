import { describe, expect, it } from "vitest";
import {
  authDegradedMetadata,
  authTokenFailureReason,
  rollingWindowBurstMetadata,
  suspiciousActivityBurstMetadata,
} from "./authOpsMetadata";

describe("authOpsMetadata", () => {
  it("rollingWindowBurstMetadata includes optional threshold and reason", () => {
    expect(
      rollingWindowBurstMetadata({
        countInWindow: 25,
        windowMs: 600_000,
        key: "k",
        threshold: 25,
        reason: "malformed_state",
      })
    ).toEqual({
      countInWindow: 25,
      windowMs: 600_000,
      key: "k",
      threshold: 25,
      reason: "malformed_state",
    });
  });

  it("suspiciousActivityBurstMetadata preserves legacy and canonical fields", () => {
    expect(
      suspiciousActivityBurstMetadata({
        signal: "failed_login",
        count: 6,
        windowMs: 600_000,
        threshold: 5,
        key: "failed_login|ip:1.2.3.4",
      })
    ).toMatchObject({
      count: 6,
      timeWindowMs: 600_000,
      countInWindow: 6,
      windowMs: 600_000,
      threshold: 5,
    });
  });

  it("authDegradedMetadata and authTokenFailureReason are stable shapes", () => {
    expect(authDegradedMetadata("reset_password_exception")).toEqual({
      degradedReason: "reset_password_exception",
    });
    expect(authTokenFailureReason("token_used")).toEqual({ reason: "token_used" });
  });
});
