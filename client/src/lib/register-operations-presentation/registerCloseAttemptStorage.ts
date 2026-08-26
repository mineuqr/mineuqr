/**
 * REGISTER-CLOSE-IDEMPOTENT-ATOMIC-CORRIDOR-1
 * Session-local close identity. Same key across retry / lost HTTP / refresh.
 */

function storageKey(restaurantId: number, financialShiftId: string): string {
  return `crmp-shift-close:${restaurantId}:${financialShiftId}`;
}

function newCloseKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `close_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function readOrCreateRegisterCloseAttemptKey(
  restaurantId: number,
  financialShiftId: string
): string {
  if (typeof sessionStorage === "undefined") return newCloseKey();
  try {
    const existing = sessionStorage.getItem(
      storageKey(restaurantId, financialShiftId)
    );
    if (existing && existing.length >= 8 && existing.length <= 128) {
      return existing;
    }
    const created = newCloseKey();
    sessionStorage.setItem(
      storageKey(restaurantId, financialShiftId),
      created
    );
    return created;
  } catch {
    return newCloseKey();
  }
}

export function clearRegisterCloseAttemptKey(
  restaurantId: number,
  financialShiftId: string
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(restaurantId, financialShiftId));
  } catch {
    /* ignore */
  }
}
