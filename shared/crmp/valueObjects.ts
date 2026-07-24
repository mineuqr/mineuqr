/**
 * CRMP / ADR-ARCH-028 · ADR-ARCH-030 — value objects.
 * Pure domain — no persistence. Money is opaque decimal strings (2 dp).
 * SHIFT-LIFECYCLE-IMPLEMENTATION-1 expands Financial Shift statuses.
 */

import { CrmpValidationError } from "./crmpErrors";

export const CRMP_PROGRAM_ID = "CRMP-IMPLEMENTATION-1" as const;
export const CRMP_ADR_ID = "ADR-ARCH-028" as const;
export const SHIFT_LIFECYCLE_PROGRAM_ID = "SHIFT-LIFECYCLE-IMPLEMENTATION-1" as const;
export const SHIFT_LIFECYCLE_ADR_ID = "ADR-ARCH-030" as const;

export const REGISTER_STATUSES = [
  "provisioned",
  "active",
  "inactive",
] as const;
export type RegisterStatus = (typeof REGISTER_STATUSES)[number];

/** ADR-ARCH-030 canonical statuses. Persisted `pending` is prohibited. */
export const SHIFT_STATUSES = [
  "open",
  "suspended",
  "closing",
  "handover_pending",
  "closed",
  "archived",
] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const SHIFT_CLOSE_REASONS = [
  "normal",
  "handover",
  "cancelled_empty",
  "recovery",
] as const;
export type ShiftCloseReason = (typeof SHIFT_CLOSE_REASONS)[number];

export const MOVEMENT_TYPES = [
  "opening_float",
  "paid_in",
  "paid_out",
  "safe_drop",
  "manual_adjustment",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const HANDOVER_OUTCOMES = [
  "pending",
  "accepted",
  "rejected",
] as const;
export type HandoverOutcome = (typeof HANDOVER_OUTCOMES)[number];

export const COUNT_KINDS = ["interim", "final"] as const;
export type CountKind = (typeof COUNT_KINDS)[number];

/** Opaque money amount — custody facts only; not Settlement money authority. */
export type MoneyAmount = Readonly<{
  amount: string;
  currencyCode: string;
}>;

export type OpeningFloat = MoneyAmount;

export type DrawerVariance = Readonly<{
  expected: string;
  actual: string;
  variance: string;
  currencyCode: string;
}>;

const AMOUNT_RE = /^-?\d+(\.\d{1,2})?$/;

export function assertMoneyAmount(value: MoneyAmount, label = "amount"): void {
  if (!value.currencyCode?.trim()) {
    throw new CrmpValidationError(`${label}: currencyCode required`);
  }
  if (!AMOUNT_RE.test(value.amount)) {
    throw new CrmpValidationError(
      `${label}: invalid decimal amount ${value.amount}`
    );
  }
}

export function assertNonNegativeMoney(
  value: MoneyAmount,
  label = "amount"
): void {
  assertMoneyAmount(value, label);
  if (toCents(value.amount) < 0) {
    throw new CrmpValidationError(`${label}: must be >= 0`);
  }
}

export function assertPositiveMoney(
  value: MoneyAmount,
  label = "amount"
): void {
  assertMoneyAmount(value, label);
  if (toCents(value.amount) <= 0) {
    throw new CrmpValidationError(`${label}: must be > 0`);
  }
}

export function toCents(amount: string): number {
  const neg = amount.startsWith("-");
  const raw = neg ? amount.slice(1) : amount;
  const [whole, frac = ""] = raw.split(".");
  const cents =
    Number.parseInt(whole, 10) * 100 +
    Number.parseInt((frac + "00").slice(0, 2), 10);
  return neg ? -cents : cents;
}

export function fromCents(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export function addAmounts(...amounts: string[]): string {
  return fromCents(amounts.reduce((sum, a) => sum + toCents(a), 0));
}

export function subtractAmounts(left: string, right: string): string {
  return fromCents(toCents(left) - toCents(right));
}

export function deriveDrawerVariance(input: {
  expected: string;
  actual: string;
  currencyCode: string;
}): DrawerVariance {
  assertNonNegativeMoney(
    { amount: input.expected, currencyCode: input.currencyCode },
    "expected"
  );
  assertNonNegativeMoney(
    { amount: input.actual, currencyCode: input.currencyCode },
    "actual"
  );
  return {
    expected: normalizeAmount(input.expected),
    actual: normalizeAmount(input.actual),
    variance: subtractAmounts(input.actual, input.expected),
    currencyCode: input.currencyCode,
  };
}

export function normalizeAmount(amount: string): string {
  return fromCents(toCents(amount));
}

/** ADR-ARCH-030 active set — blocks second open and Register close/deactivate. */
export function isActiveShiftStatus(status: ShiftStatus): boolean {
  return (
    status === "open" ||
    status === "suspended" ||
    status === "closing" ||
    status === "handover_pending"
  );
}

export function isTerminalShiftStatus(status: ShiftStatus): boolean {
  return status === "closed" || status === "archived";
}
