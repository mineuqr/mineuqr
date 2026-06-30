import { describe, expect, it } from "vitest";
import { ConnectorReconnectPolicy } from "../services/ConnectorReconnectPolicy";
import { infrastructureFailure } from "../contracts/sessionFailureContracts";

describe("ConnectorReconnectPolicy", () => {
  it("applies exponential backoff delays", () => {
    const policy = new ConnectorReconnectPolicy({
      baseDelayMs: 1_000,
      maxDelayMs: 8_000,
      maxAttempts: 5,
    });

    expect(policy.nextDelayMs(1)).toBe(1_000);
    expect(policy.nextDelayMs(2)).toBe(2_000);
    expect(policy.nextDelayMs(3)).toBe(4_000);
    expect(policy.nextDelayMs(4)).toBe(8_000);
    expect(policy.nextDelayMs(5)).toBe(8_000);
  });

  it("limits retry attempts", () => {
    const policy = new ConnectorReconnectPolicy({ baseDelayMs: 100, maxDelayMs: 100, maxAttempts: 3 });
    expect(policy.shouldRetry(3)).toBe(true);
    expect(policy.shouldRetry(4)).toBe(false);
  });
});

describe("infrastructure failure mapping", () => {
  it("maps canonical failure codes", () => {
    const failure = infrastructureFailure("authentication_failure", "Invalid credential");
    expect(failure.code).toBe("authentication_failure");
    expect(failure.message).toBe("Invalid credential");
  });
});
