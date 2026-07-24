/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — remember active Register for settle hints.
 * Presentation/session only. Does not invent Financial Shift.
 */

const prefix = "mineuqr.crmp.activeRegister.";

export function rememberActiveRegister(
  restaurantId: number,
  registerId: string | null
): void {
  if (typeof sessionStorage === "undefined") return;
  const key = `${prefix}${restaurantId}`;
  if (!registerId?.trim()) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, registerId.trim());
}

export function readActiveRegister(restaurantId: number): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const value = sessionStorage.getItem(`${prefix}${restaurantId}`);
  return value?.trim() || null;
}
