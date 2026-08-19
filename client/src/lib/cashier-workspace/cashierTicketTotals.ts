/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Display-only ticket arithmetic from catalog decimal strings.
 * Not Check Revenue. Not a Cashier sales total.
 */

function toCents(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  if (!Number.isSafeInteger(whole)) return null;
  return whole * 100 + Number(frac);
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function displayMoneyTimesQuantity(
  unitPrice: string,
  quantity: number
): string {
  if (!Number.isInteger(quantity) || quantity < 0) return unitPrice.trim();
  const cents = toCents(unitPrice);
  if (cents == null) return unitPrice.trim();
  return fromCents(cents * quantity);
}

export function isPositiveDisplayMoney(
  value: string | null | undefined
): boolean {
  if (value == null) return false;
  const cents = toCents(value);
  return cents != null && cents > 0;
}

export function displayTicketTotal(
  lines: readonly { price: string; quantity: number }[]
): string | null {
  let sum = 0;
  for (const line of lines) {
    const cents = toCents(line.price);
    if (cents == null || !Number.isInteger(line.quantity) || line.quantity < 0) {
      return null;
    }
    sum += cents * line.quantity;
  }
  return fromCents(sum);
}
