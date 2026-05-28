import type { Request, Response } from "express";
import { logRateLimitExceeded } from "../_core/authAudit";
import {
  AUTH_BURST_LIMIT,
  checkRateLimit,
  getAuthBurstKey,
  getLoginRateLimitKey,
} from "../_core/rateLimit";
import { PASSWORD_RESET_RATE_LIMIT } from "./constants";
import { rateLimitedResponse } from "./httpHelpers";

/** Returns true when the request was blocked (caller should return). */
export function enforceAuthBurstLimit(req: Request, res: Response): boolean {
  const burstKey = getAuthBurstKey(req);
  const burst = checkRateLimit(burstKey, AUTH_BURST_LIMIT);
  if (burst.allowed) return false;
  logRateLimitExceeded(req, burstKey);
  rateLimitedResponse(res, burst.retryAfterMs ?? AUTH_BURST_LIMIT.windowMs);
  return true;
}

/** Returns true when forgot-password email limit was exceeded. */
export function enforceForgotPasswordRateLimit(
  req: Request,
  res: Response,
  normalizedEmail: string
): boolean {
  const key = `pwdreset:${getLoginRateLimitKey(req, normalizedEmail || "unknown")}`;
  const limit = checkRateLimit(key, PASSWORD_RESET_RATE_LIMIT);
  if (limit.allowed) return false;
  logRateLimitExceeded(req, key);
  rateLimitedResponse(res, limit.retryAfterMs ?? PASSWORD_RESET_RATE_LIMIT.windowMs);
  return true;
}
