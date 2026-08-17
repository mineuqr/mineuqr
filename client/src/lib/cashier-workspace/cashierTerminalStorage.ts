/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Client-only last-used terminal reminder. Not authorization. Not a second SSOT.
 */

const PREFIX = "cashier:terminal:";
const TERMINAL_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cashierTerminalStorageKey(restaurantId: number): string {
  return `${PREFIX}${restaurantId}`;
}

export function isCashierTerminalId(value: string | null | undefined): value is string {
  return typeof value === "string" && TERMINAL_ID_RE.test(value);
}

export function readCashierTerminalId(restaurantId: number): string | null {
  if (typeof sessionStorage === "undefined" || restaurantId <= 0) return null;
  const value = sessionStorage.getItem(cashierTerminalStorageKey(restaurantId));
  return isCashierTerminalId(value) ? value : null;
}

export function writeCashierTerminalId(
  restaurantId: number,
  terminalId: string | null
): void {
  if (typeof sessionStorage === "undefined" || restaurantId <= 0) return;
  const key = cashierTerminalStorageKey(restaurantId);
  if (!isCashierTerminalId(terminalId)) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, terminalId);
}
