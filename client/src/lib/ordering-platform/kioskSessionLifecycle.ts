/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 — kiosk customer session lifecycle.
 *
 * Each customer session is isolated. No customer information survives
 * between sessions. Automatic reset is mandatory after terminal events.
 */

export const KIOSK_SESSION_RESET_TRIGGERS = [
  "successful_order",
  "cancellation",
  "timeout",
  "administrative_reset",
] as const;

export type KioskSessionResetTrigger = (typeof KIOSK_SESSION_RESET_TRIGGERS)[number];

export const KIOSK_SESSION_LIFECYCLE_STATES = [
  "idle",
  "active",
  "checking_out",
  "confirming",
  "resetting",
] as const;

export type KioskSessionLifecycleState = (typeof KIOSK_SESSION_LIFECYCLE_STATES)[number];

/**
 * Isolation rules — binding for future UI implementation.
 * Cart, language choice, PII drafts, and navigation stack must clear on reset.
 */
export const KIOSK_SESSION_ISOLATION_RULES = [
  "clear_cart",
  "clear_customer_draft_fields",
  "clear_language_selection_override",
  "clear_navigation_stack",
  "discard_unsaved_modifiers",
  "return_to_idle_experience",
] as const;

export type KioskSessionIsolationRule = (typeof KIOSK_SESSION_ISOLATION_RULES)[number];

/** Default idle timeout policy key — value configured by experience, not platform business rules. */
export const KIOSK_SESSION_IDLE_TIMEOUT_POLICY_KEY = "kiosk_session_idle_timeout_ms" as const;

/**
 * Maps reset triggers to mandatory isolation rules.
 * Ensures session wipe is complete regardless of trigger.
 */
export const KIOSK_SESSION_RESET_REQUIRES_ALL_ISOLATION_RULES = true as const;
