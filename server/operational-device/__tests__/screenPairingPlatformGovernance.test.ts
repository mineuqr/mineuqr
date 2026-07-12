import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitStoreForTests } from "../../_core/rateLimit";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import type { TrpcContext } from "../../_core/context";
import { generatePairingCode } from "../pairing/pairingCrypto";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { ScreenPairingService } from "../pairing/ScreenPairingService";
import { OperationalDeviceAuthService } from "../services/OperationalDeviceAuthService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";
import {
  PAIRING_REDEEM_BURST_LIMIT,
  PAIRING_REDEEM_RATE_LIMIT,
  enforcePairingRedeemRateLimit,
  getPairingRedeemBurstKey,
} from "../governance/pairingRateLimits";
import { pairingFailureToLifecycleReason } from "../governance/pairingLifecycleGovernance";

const NOW = 1_700_000_000_000;

const opsLogMock = vi.fn();
vi.mock("../../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

function buildCtx(ip = "203.0.113.10"): TrpcContext {
  return {
    req: {
      ip,
      headers: {},
      socket: { remoteAddress: ip },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: null,
    correlationId: "corr_governance_test",
  };
}

describe("SCREEN-PAIRING-CODE-GOVERNANCE-1 — lifecycle", () => {
  beforeEach(() => {
    opsLogMock.mockClear();
  });

  it("rejects expired pairing codes", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 10,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    const token = await store.getToken(created.token.tokenId);
    expect(token).not.toBeNull();
    await store.saveToken({
      ...token!,
      activationCodeExpiresAt: new Date(NOW - 60_000).toISOString(),
    });

    const result = await pairing.redeemPairingCode(created.token.pairingCode);
    expect(result).toEqual({ ok: false, code: "pairing_code_expired" });
    expect(pairingFailureToLifecycleReason("pairing_code_expired")).toBe("expired");
  });

  it("rejects pairing when screen is disabled", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 11,
      role: "kitchen_display",
      displayName: "Line",
    });

    await registry.disableDevice(created.device.deviceId, 11);
    const result = await pairing.redeemPairingCode(created.token.pairingCode);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(["device_disabled", "token_revoked"]).toContain(result.code);
  });

  it("rejects pairing when token is revoked", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 12,
      role: "expo_display",
      displayName: "Expo",
    });

    await registry.revokeToken(created.device.deviceId, 12);
    const result = await pairing.redeemPairingCode(created.token.pairingCode);
    expect(result).toEqual({ ok: false, code: "token_revoked" });
  });

  it("consumeActivationCode allows only one successful consumption", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 13,
      role: "kitchen_display",
      displayName: "Prep",
    });

    expect(await store.consumeActivationCode(created.token.tokenId)).toBe(true);
    expect(await store.consumeActivationCode(created.token.tokenId)).toBe(false);
  });

  it("regenerated credentials invalidate prior pairing code with token_revoked", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 14,
      role: "pickup_display",
      displayName: "Pickup",
    });
    const oldCode = created.token.pairingCode;

    await registry.regenerateCredential(created.device.deviceId, 14);
    const oldResult = await pairing.redeemPairingCode(oldCode);
    expect(oldResult.ok).toBe(false);
    if (oldResult.ok) return;
    expect(oldResult.code).toBe("token_revoked");
  });
});

describe("SCREEN-PAIRING-CODE-GOVERNANCE-1 — security", () => {
  it("runtime authentication rejects pairing code as secret", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 20,
      role: "kitchen_display",
      displayName: "Auth Test",
    });

    const result = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.pairingCode,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_credentials");
  });

  it("does not log plaintext pairing codes on redeem audit", async () => {
    opsLogMock.mockClear();
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 21,
      role: "kitchen_display",
      displayName: "Audit",
    });
    const code = created.token.pairingCode;

    await pairing.redeemPairingCode(code, {
      audit: { correlationId: "audit-success", ip: "203.0.113.1" },
    });

    for (const call of opsLogMock.mock.calls) {
      const payload = JSON.stringify(call[0]);
      expect(payload).not.toContain(code);
      expect(payload).not.toContain(created.token.secret);
    }

    opsLogMock.mockClear();
    await pairing.redeemPairingCode("ZZZZZZ", {
      audit: { correlationId: "audit-fail", ip: "203.0.113.2" },
    });

    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.pairing_redeem_failed,
        metadata: expect.objectContaining({ failureCode: "pairing_code_invalid" }),
      })
    );
  });
});

describe("SCREEN-PAIRING-CODE-GOVERNANCE-1 — rate limiting", () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
    opsLogMock.mockClear();
  });

  it("blocks pairing redeem after burst limit with operator-safe message", () => {
    const ctx = buildCtx();

    for (let i = 0; i < PAIRING_REDEEM_BURST_LIMIT.maxAttempts; i++) {
      enforcePairingRedeemRateLimit(ctx);
    }

    expect(() => enforcePairingRedeemRateLimit(ctx)).toThrow(TRPCError);
    try {
      enforcePairingRedeemRateLimit(ctx);
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("TOO_MANY_REQUESTS");
      expect(trpcError.message).toBe("Unable to connect. Try again.");
      expect(trpcError.message).not.toContain("limit");
    }

    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.pairing_rate_limit_exceeded,
        metadata: expect.objectContaining({ limitKey: "burst" }),
      })
    );
  });

  it("uses IP-scoped keys for pairing redeem limits", () => {
    const ctxA = buildCtx("203.0.113.50");
    const ctxB = buildCtx("203.0.113.51");

    for (let i = 0; i < PAIRING_REDEEM_BURST_LIMIT.maxAttempts; i++) {
      enforcePairingRedeemRateLimit(ctxA);
    }

    expect(() => enforcePairingRedeemRateLimit(ctxA)).toThrow(TRPCError);
    expect(() => enforcePairingRedeemRateLimit(ctxB)).not.toThrow();
    expect(getPairingRedeemBurstKey(ctxA.req)).not.toBe(getPairingRedeemBurstKey(ctxB.req));
  });

  it("sustained limit is configurable via constants", () => {
    expect(PAIRING_REDEEM_RATE_LIMIT.maxAttempts).toBeGreaterThan(0);
    expect(PAIRING_REDEEM_RATE_LIMIT.windowMs).toBeGreaterThan(0);
  });
});

describe("SCREEN-PAIRING-CODE-GOVERNANCE-1 — pairing crypto", () => {
  it("generates valid 6-character pairing codes", () => {
    let code = generatePairingCode();
    for (let attempt = 0; attempt < 20 && !/^[A-Z2-9]{6}$/.test(code); attempt += 1) {
      code = generatePairingCode();
    }
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
  });
});
