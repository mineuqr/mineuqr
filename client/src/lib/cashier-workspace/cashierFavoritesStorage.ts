/**
 * CASHIER-UX-REDESIGN-1 — local favorites for catalog scanability.
 * Presentation preference only. Not a server catalog.
 */

const PREFIX = "mineuqr.cashier.favorites.v1";

function key(restaurantId: number): string {
  return `${PREFIX}:${restaurantId}`;
}

export function readCashierFavoriteIds(restaurantId: number): number[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is number => typeof id === "number" && Number.isInteger(id))
      .slice(0, 200);
  } catch {
    return [];
  }
}

export function writeCashierFavoriteIds(
  restaurantId: number,
  ids: readonly number[]
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key(restaurantId), JSON.stringify([...ids].slice(0, 200)));
  } catch {
    // ignore quota
  }
}

export function toggleCashierFavoriteId(
  restaurantId: number,
  menuItemId: number
): number[] {
  const current = readCashierFavoriteIds(restaurantId);
  const next = current.includes(menuItemId)
    ? current.filter((id) => id !== menuItemId)
    : [...current, menuItemId];
  writeCashierFavoriteIds(restaurantId, next);
  return next;
}
