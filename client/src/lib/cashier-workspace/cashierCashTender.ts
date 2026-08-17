/**
 * Cashier presentation-only cash tender math.
 * Does not persist amounts. Settlement still uses Check grandTotal.
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

export function isCashReceivedSufficient(
  received: string,
  amountDue: string
): boolean {
  const receivedCents = toCents(received);
  const dueCents = toCents(amountDue);
  if (receivedCents == null || dueCents == null) return false;
  return receivedCents >= dueCents;
}

export function displayCashChange(
  received: string,
  amountDue: string
): string | null {
  const receivedCents = toCents(received);
  const dueCents = toCents(amountDue);
  if (receivedCents == null || dueCents == null) return null;
  if (receivedCents < dueCents) return null;
  return fromCents(receivedCents - dueCents);
}
