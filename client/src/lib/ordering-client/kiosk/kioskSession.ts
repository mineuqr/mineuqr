/**
 * SELF-ORDERING-KIOSK-PLATFORM-1 — kiosk session helpers (channel-owned).
 * Isolation / reset only — no ordering business rules.
 */
import {
  KIOSK_SESSION_IDLE_TIMEOUT_POLICY_KEY,
  KIOSK_SESSION_ISOLATION_RULES,
  KIOSK_SESSION_RESET_TRIGGERS,
  type KioskSessionResetTrigger,
} from "@/lib/ordering-platform/kioskSessionLifecycle";

/** Default idle timeout (ms) — experience policy, not platform business rules. */
export const KIOSK_DEFAULT_IDLE_TIMEOUT_MS = 120_000;

/** Confirmation dwell before automatic reset (ms). */
export const KIOSK_CONFIRMATION_RESET_MS = 8_000;

export function createKioskDeviceSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `kiosk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isKioskSessionResetTrigger(
  value: string
): value is KioskSessionResetTrigger {
  return (KIOSK_SESSION_RESET_TRIGGERS as readonly string[]).includes(value);
}

/** All isolation rules required on every reset (binding). */
export function kioskIsolationRulesOnReset(): readonly string[] {
  return KIOSK_SESSION_ISOLATION_RULES;
}

export { KIOSK_SESSION_IDLE_TIMEOUT_POLICY_KEY };
