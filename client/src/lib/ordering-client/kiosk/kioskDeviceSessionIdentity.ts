/**
 * SELF-ORDERING-RUNTIME-IDENTITY-FIX-1
 *
 * Kiosk deviceSessionId lifecycle — immutable for one customer journey.
 * Survives KioskShell remounts (menu ↔ cart ↔ checkout route swaps).
 * Rotates only on intentional session boundaries (idle Start / reset).
 *
 * Not a cart key. Identity for CartScopeAdapter.deviceSessionId only.
 */
import { createKioskDeviceSessionId } from "./kioskSession";

const DEVICE_SESSION_NAMESPACE = "mineuqr:kiosk:deviceSession" as const;

export type KioskDeviceSessionIdentityInput = Readonly<{
  slug: string;
  stationId: string;
  kioskId?: string | null;
}>;

/** Stable sessionStorage key for the journey deviceSessionId. */
export function buildKioskDeviceSessionStorageKey(
  input: KioskDeviceSessionIdentityInput
): string {
  const slug = String(input.slug ?? "").trim();
  const stationId = String(input.stationId ?? "").trim();
  const kioskId = String(input.kioskId ?? stationId).trim() || stationId;
  return `${DEVICE_SESSION_NAMESPACE}:${slug}:${stationId}:${kioskId}`;
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

/**
 * Load existing journey deviceSessionId or create + persist one.
 * Same inputs always yield the same id until rotate/clear.
 */
export function loadOrCreateKioskDeviceSessionId(
  input: KioskDeviceSessionIdentityInput
): string {
  const slug = String(input.slug ?? "").trim();
  const stationId = String(input.stationId ?? "").trim();
  if (!slug || !stationId) {
    return createKioskDeviceSessionId();
  }

  const storageKey = buildKioskDeviceSessionStorageKey(input);
  if (canUseSessionStorage()) {
    try {
      const existing = sessionStorage.getItem(storageKey)?.trim();
      if (existing) return existing;
    } catch {
      /* private mode */
    }
  }

  const created = createKioskDeviceSessionId();
  if (canUseSessionStorage()) {
    try {
      sessionStorage.setItem(storageKey, created);
    } catch {
      /* quota */
    }
  }
  return created;
}

/** Start a new customer journey — new deviceSessionId for this station scope. */
export function rotateKioskDeviceSessionId(
  input: KioskDeviceSessionIdentityInput
): string {
  const next = createKioskDeviceSessionId();
  const slug = String(input.slug ?? "").trim();
  const stationId = String(input.stationId ?? "").trim();
  if (!slug || !stationId || !canUseSessionStorage()) return next;

  try {
    sessionStorage.setItem(buildKioskDeviceSessionStorageKey(input), next);
  } catch {
    /* ignore */
  }
  return next;
}

/** Drop persisted journey identity (optional isolation helper). */
export function clearKioskDeviceSessionId(
  input: KioskDeviceSessionIdentityInput
): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.removeItem(buildKioskDeviceSessionStorageKey(input));
  } catch {
    /* ignore */
  }
}
