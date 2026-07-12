import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import type { PairingRedeemFailureCode } from "../pairing/pairingContracts";
import { pairingFailureToLifecycleReason } from "./pairingLifecycleGovernance";

export type PairingAuditContext = {
  correlationId?: string;
  ip?: string;
  procedure?: string;
  actorId?: number | null;
  restaurantId?: number | null;
};

const REDEEM_PROCEDURE = "operationalDevice.runtime.redeemPairingCode";

function baseFields(ctx: PairingAuditContext) {
  return {
    correlationId: ctx.correlationId,
    ip: ctx.ip,
    procedure: ctx.procedure ?? REDEEM_PROCEDURE,
    actorId: ctx.actorId ?? null,
    restaurantId: ctx.restaurantId ?? null,
  };
}

/** Never log plaintext pairing codes or secrets. */
export function logPairingCodeIssued(
  ctx: PairingAuditContext & { deviceId: string; tokenId: string }
): void {
  opsLog({
    type: OPS_EVENT.pairing_code_issued,
    category: "SECURITY",
    severity: "info",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      deviceId: ctx.deviceId,
      tokenId: ctx.tokenId,
    },
  });
}

export function logPairingRedeemSucceeded(
  ctx: PairingAuditContext & { deviceId: string; tokenId: string }
): void {
  opsLog({
    type: OPS_EVENT.pairing_code_redeemed,
    category: "SECURITY",
    severity: "info",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      deviceId: ctx.deviceId,
      tokenId: ctx.tokenId,
    },
  });
}

export function logPairingRedeemFailed(
  ctx: PairingAuditContext & { failureCode: PairingRedeemFailureCode }
): void {
  opsLog({
    type: OPS_EVENT.pairing_redeem_failed,
    category: "SECURITY",
    severity: "warn",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      failureCode: ctx.failureCode,
      lifecycleReason: pairingFailureToLifecycleReason(ctx.failureCode),
    },
  });
}

export function logPairingRateLimitExceeded(
  ctx: PairingAuditContext & { limitKey: "burst" | "sustained" }
): void {
  opsLog({
    type: OPS_EVENT.pairing_rate_limit_exceeded,
    category: "SECURITY",
    severity: "warn",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      limitKey: ctx.limitKey,
    },
  });
}

export function logPairingCredentialRegenerated(
  ctx: PairingAuditContext & { deviceId: string; tokenId: string }
): void {
  opsLog({
    type: OPS_EVENT.pairing_credential_regenerated,
    category: "SECURITY",
    severity: "info",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      deviceId: ctx.deviceId,
      tokenId: ctx.tokenId,
    },
  });
}

export function logPairingScreenDeleted(ctx: PairingAuditContext & { deviceId: string }): void {
  opsLog({
    type: OPS_EVENT.pairing_screen_deleted,
    category: "SECURITY",
    severity: "info",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      deviceId: ctx.deviceId,
    },
  });
}

export function logPairingRevoked(ctx: PairingAuditContext & { deviceId: string }): void {
  opsLog({
    type: OPS_EVENT.pairing_revoked,
    category: "SECURITY",
    severity: "info",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      deviceId: ctx.deviceId,
    },
  });
}

export function logOperationalScreenCreated(
  ctx: PairingAuditContext & { deviceId: string; tokenId: string }
): void {
  opsLog({
    type: OPS_EVENT.operational_screen_created,
    category: "SECURITY",
    severity: "info",
    ts: new Date().toISOString(),
    ...baseFields(ctx),
    metadata: {
      deviceId: ctx.deviceId,
      tokenId: ctx.tokenId,
    },
  });
}
