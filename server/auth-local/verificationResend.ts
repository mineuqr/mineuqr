import type { Request } from "express";
import {
  AUTH_OPS_MAX_COUNTER_KEYS,
  authOpsLog,
} from "../_core/authOpsMetadata";
import {
  cleanupEmitCooldownStamps,
  trimEmitCooldownStamps,
  tryConsumeEmitCooldown,
  type EmitCooldownStamp,
} from "../_core/emitCooldown";
import type { OpsEventType } from "../_core/opsTaxonomy";
import {
  VERIFICATION_EMAIL_MIN_INTERVAL_MS,
  VERIFICATION_RESEND_EMIT_COOLDOWN_MS,
  VERIFICATION_RESEND_MAX_ACTOR,
  VERIFICATION_RESEND_MAX_IP,
  VERIFICATION_RESEND_WINDOW_MS,
} from "./constants";

const resendEmitCooldown = new Map<string, EmitCooldownStamp>();

type ResendStamp = { lastSentAt: number; lastSeenAt: number };
const lastSentByActor = new Map<string, ResendStamp>();

export function verificationResendActorKey(userId: number): string {
  return `verify_resend:actor:${userId}`;
}

export function verificationResendIpKey(ip: string): string {
  return `verify_resend:ip:${ip}`;
}

export function verificationEmailStampKey(userId: number): string {
  return `verify_email_last_sent:actor:${userId}`;
}

export function cleanupVerificationResendMaps(now: number): void {
  for (const [k, v] of Array.from(lastSentByActor.entries())) {
    if (now - v.lastSeenAt > VERIFICATION_RESEND_WINDOW_MS * 2) {
      lastSentByActor.delete(k);
    }
  }
  cleanupEmitCooldownStamps(
    resendEmitCooldown,
    now,
    VERIFICATION_RESEND_WINDOW_MS * 2
  );

  const maxKeys = AUTH_OPS_MAX_COUNTER_KEYS;
  if (lastSentByActor.size > maxKeys) {
    const entries = Array.from(lastSentByActor.entries()).sort(
      (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
    );
    const toRemove = lastSentByActor.size - maxKeys;
    for (let i = 0; i < toRemove; i++) lastSentByActor.delete(entries[i]![0]);
  }
  trimEmitCooldownStamps(resendEmitCooldown, maxKeys);
}

/** Touch stamp last-seen (preserves lastSentAt when reusing existing entry). */
export function touchVerificationEmailStamp(stampKey: string, now: number): ResendStamp | undefined {
  const existing = lastSentByActor.get(stampKey);
  if (existing) existing.lastSeenAt = now;
  return existing;
}

/** True when a verification email was sent too recently for this actor. */
export function isVerificationEmailAmplified(stampKey: string, now: number): boolean {
  const existing = lastSentByActor.get(stampKey);
  return Boolean(
    existing && now - existing.lastSentAt < VERIFICATION_EMAIL_MIN_INTERVAL_MS
  );
}

export function recordVerificationEmailSent(stampKey: string, now: number): void {
  lastSentByActor.set(stampKey, { lastSentAt: now, lastSeenAt: now });
}

export function maybeEmitResendCooldowned(input: {
  key: string;
  now: number;
  req: Request;
  actorId?: number | null;
  type: OpsEventType;
  metadata: Record<string, unknown>;
}): void {
  if (
    !tryConsumeEmitCooldown({
      stamps: resendEmitCooldown,
      key: input.key,
      now: input.now,
      cooldownMs: VERIFICATION_RESEND_EMIT_COOLDOWN_MS,
    })
  ) {
    return;
  }

  authOpsLog({
    type: input.type,
    severity: "warn",
    req: input.req,
    ts: new Date(input.now).toISOString(),
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  });
}

export {
  VERIFICATION_EMAIL_MIN_INTERVAL_MS,
  VERIFICATION_RESEND_MAX_ACTOR,
  VERIFICATION_RESEND_MAX_IP,
  VERIFICATION_RESEND_WINDOW_MS,
} from "./constants";
