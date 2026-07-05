import { describe, expect, it } from "vitest";
import { parseManualCredentials, parsePairingPayload } from "../pairingPayload";

const validV2 = JSON.stringify({
  mineuqr: "operational-screen-pairing",
  v: 2,
  deviceId: "dev_abc123xyz",
  tokenId: "tok_def456uvw",
  secret: "s".repeat(32),
  restaurantId: 1,
});

describe("pairingPayload", () => {
  it("parses v2 pairing payload", () => {
    const result = parsePairingPayload(validV2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.credentials.deviceId).toBe("dev_abc123xyz");
      expect(result.credentials.tokenId).toBe("tok_def456uvw");
    }
  });

  it("rejects v1 payload", () => {
    const v1 = JSON.stringify({
      v: 1,
      deviceId: "dev_abc123xyz",
      token: "secret-only",
    });
    const result = parsePairingPayload(v1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unsupported_version");
  });

  it("validates manual credentials", () => {
    const result = parseManualCredentials({
      deviceId: "dev_abc123xyz",
      tokenId: "tok_def456uvw",
      secret: "x".repeat(32),
    });
    expect(result.ok).toBe(true);
  });
});
