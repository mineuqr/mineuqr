import type { Request } from "express";
import { TRPCError } from "@trpc/server";
import { checkRateLimit, getClientIp } from "../../_core/rateLimit";
import type { TrpcContext } from "../../_core/context";
import { logPairingRateLimitExceeded } from "./pairingAudit";

function readPositiveInt(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Configurable pairing redeem limits (SCREEN-PAIRING-CODE-GOVERNANCE-1). */
export const PAIRING_REDEEM_RATE_LIMIT = {
  windowMs: readPositiveInt("PAIRING_REDEEM_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  maxAttempts: readPositiveInt("PAIRING_REDEEM_RATE_LIMIT_MAX", 20),
} as const;

export const PAIRING_REDEEM_BURST_LIMIT = {
  windowMs: readPositiveInt("PAIRING_REDEEM_BURST_WINDOW_MS", 60 * 1000),
  maxAttempts: readPositiveInt("PAIRING_REDEEM_BURST_MAX", 10),
} as const;

export function getPairingRedeemIpKey(req: Request): string {
  return `pairing_redeem:ip:${getClientIp(req)}`;
}

export function getPairingRedeemBurstKey(req: Request): string {
  return `pairing_redeem_burst:ip:${getClientIp(req)}`;
}

/** Operator-safe message — no timing or limit details exposed. */
export const PAIRING_RATE_LIMIT_OPERATOR_MESSAGE = "Unable to connect. Try again." as const;

/**
 * Enforces pairing redeem rate limits. Throws TRPCError when blocked.
 * Affects only pairing redemption — runtime authentication is unchanged.
 */
export function enforcePairingRedeemRateLimit(ctx: TrpcContext): void {
  const burst = checkRateLimit(getPairingRedeemBurstKey(ctx.req), PAIRING_REDEEM_BURST_LIMIT);
  if (!burst.allowed) {
    logPairingRateLimitExceeded({
      correlationId: ctx.correlationId,
      ip: getClientIp(ctx.req),
      procedure: "operationalDevice.runtime.redeemPairingCode",
      limitKey: "burst",
    });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: PAIRING_RATE_LIMIT_OPERATOR_MESSAGE,
    });
  }

  const sustained = checkRateLimit(getPairingRedeemIpKey(ctx.req), PAIRING_REDEEM_RATE_LIMIT);
  if (!sustained.allowed) {
    logPairingRateLimitExceeded({
      correlationId: ctx.correlationId,
      ip: getClientIp(ctx.req),
      procedure: "operationalDevice.runtime.redeemPairingCode",
      limitKey: "sustained",
    });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: PAIRING_RATE_LIMIT_OPERATOR_MESSAGE,
    });
  }
}
