/**
 * Stable user-facing messages for one-time token endpoints (AUTH2-D.2).
 * Centralized to avoid drift between reset-password and verify-email handlers.
 */

import type { Response } from "express";

/** JSON reset-password / forgot-password link errors (Arabic). */
export const RESET_LINK_ERROR = {
  invalid: "الرابط غير صالح",
  expired: "انتهت صلاحية الرابط",
} as const;

/** Plain-text verify-email GET errors (English). */
export const EMAIL_VERIFICATION_ERROR = {
  invalid: "Invalid token",
  expired: "Expired token",
} as const;

export function respondResetLinkInvalid(res: Response) {
  return res.status(400).json({ error: RESET_LINK_ERROR.invalid });
}

export function respondResetLinkExpired(res: Response) {
  return res.status(400).json({ error: RESET_LINK_ERROR.expired });
}

export function respondEmailVerificationInvalid(res: Response) {
  return res.status(400).send(EMAIL_VERIFICATION_ERROR.invalid);
}

export function respondEmailVerificationExpired(res: Response) {
  return res.status(400).send(EMAIL_VERIFICATION_ERROR.expired);
}
