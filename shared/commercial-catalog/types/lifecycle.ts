/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Live Commercial Plans — no version lifecycle.
 */

export const STANDARD_LIVE_PLAN_CODES = [
  "basic",
  "professional",
  "enterprise",
] as const;

export type StandardLivePlanCode = (typeof STANDARD_LIVE_PLAN_CODES)[number];

export function isStandardLivePlanCode(code: string): code is StandardLivePlanCode {
  return (STANDARD_LIVE_PLAN_CODES as readonly string[]).includes(
    code.toLowerCase()
  );
}
