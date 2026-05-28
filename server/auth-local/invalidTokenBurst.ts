import type { Request } from "express";
import {
  AUTH_OPS_MAX_COUNTER_KEYS,
  authHttpContext,
  authOpsLog,
  rollingWindowBurstMetadata,
} from "../_core/authOpsMetadata";
import { createCooldownCounterMap } from "../_core/cooldownCounterMap";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  INVALID_TOKEN_EMIT_COOLDOWN_MS,
  INVALID_TOKEN_MAX_ATTEMPTS,
  INVALID_TOKEN_WINDOW_MS,
} from "./constants";

export type InvalidTokenEndpoint = "reset-password" | "verify-email";

const invalidTokenCounters = createCooldownCounterMap({
  windowMs: INVALID_TOKEN_WINDOW_MS,
  emitCooldownMs: INVALID_TOKEN_EMIT_COOLDOWN_MS,
  maxKeys: AUTH_OPS_MAX_COUNTER_KEYS,
});

function counterKey(input: { ip: string; endpoint: InvalidTokenEndpoint }): string {
  return `invalid_token:${input.endpoint}:ip:${input.ip}`;
}

/**
 * Track invalid one-time token attempts; emit cooldowned burst ops events.
 * Returns throttle state for soft short-circuit in route handlers.
 */
export function noteInvalidTokenAttempt(input: {
  req: Request;
  endpoint: InvalidTokenEndpoint;
}): { throttled: boolean; count: number } {
  const now = Date.now();
  const http = authHttpContext(input.req);
  const key = counterKey({ ip: http.ip, endpoint: input.endpoint });
  const entry = invalidTokenCounters.increment(key, now);
  const count = entry.count;

  if (process.env.AUTH_DEBUG === "1") {
    console.info("[Auth] invalid token attempt", {
      ip: http.ip,
      endpoint: input.endpoint,
      key,
      count,
      threshold: INVALID_TOKEN_MAX_ATTEMPTS,
    });
  }

  const throttled = count >= INVALID_TOKEN_MAX_ATTEMPTS;

  if (count === INVALID_TOKEN_MAX_ATTEMPTS || throttled) {
    if (invalidTokenCounters.canEmit(entry, now)) {
      invalidTokenCounters.markEmitted(entry, now);
      authOpsLog({
        type: throttled
          ? OPS_EVENT.auth_token_bruteforce_suspected
          : OPS_EVENT.auth_invalid_token_burst,
        severity: "warn",
        req: input.req,
        ts: new Date(now).toISOString(),
        metadata: rollingWindowBurstMetadata({
          countInWindow: count,
          windowMs: INVALID_TOKEN_WINDOW_MS,
          threshold: INVALID_TOKEN_MAX_ATTEMPTS,
          key,
          signal: throttled ? "auth_token_bruteforce" : "auth_invalid_token_burst",
          extra: { endpoint: input.endpoint },
        }),
      });
    }
  }

  return { throttled, count };
}
