/**
 * SETTLEMENT-UI-CLEANUP-1 — Split Payment production UI suspension.
 *
 * Status:      Dormant (operator UI)
 * UI:          Disabled
 * Core:        Active (Domain · Persistence · Integration · Projection · API)
 * Reactivation: Supported — remount SplitPaymentPanel when product requires it.
 *
 * Multi Check Allocation remains separately dormant (PRODUCTION-ADOPTION-1 Rev 2.0).
 */

export const SPLIT_PAYMENT_CAPABILITY_STATUS = "dormant" as const;

export const SPLIT_PAYMENT_UI_ENABLED = false as const;

export const SPLIT_PAYMENT_CORE_ACTIVE = true as const;

export const SPLIT_PAYMENT_REACTIVATION_SUPPORTED = true as const;

/** Production UI must not mount Split Payment presentation when this is false. */
export function isSplitPaymentUiEnabled(): boolean {
  return SPLIT_PAYMENT_UI_ENABLED;
}
