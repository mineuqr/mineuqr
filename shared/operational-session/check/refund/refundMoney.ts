/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — refund money algebra.
 * Deterministic 2-decimal restaurant money. No I/O. No tax recalculation.
 */

import {
  InvalidRefundMoneyError,
  RefundBudgetNegativeError,
} from "./refundErrors";

const MONEY_EPS = 0.001;

export function parseRefundMoney(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new InvalidRefundMoneyError(`Invalid refund money amount: ${value}`);
  }
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatRefundMoney(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidRefundMoneyError(`Invalid refund money number: ${value}`);
  }
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

export function refundMoneyEquals(a: string, b: string): boolean {
  return Math.abs(parseRefundMoney(a) - parseRefundMoney(b)) <= MONEY_EPS;
}

export function refundMoneyAdd(a: string, b: string): string {
  return formatRefundMoney(parseRefundMoney(a) + parseRefundMoney(b));
}

export function refundMoneySub(a: string, b: string): string {
  const result = parseRefundMoney(a) - parseRefundMoney(b);
  if (result < -MONEY_EPS) {
    throw new RefundBudgetNegativeError(
      `RF-BUDGET-05: subtraction would go negative: ${a} - ${b}`
    );
  }
  return formatRefundMoney(Math.max(0, result));
}

export function refundMoneyLessOrEqual(a: string, b: string): boolean {
  return parseRefundMoney(a) <= parseRefundMoney(b) + MONEY_EPS;
}

export function refundMoneyGreaterThan(a: string, b: string): boolean {
  return parseRefundMoney(a) > parseRefundMoney(b) + MONEY_EPS;
}

export function assertPositiveRefundAmount(amount: string): string {
  const n = parseRefundMoney(amount);
  if (n <= 0) {
    throw new InvalidRefundMoneyError(
      `RF-INV-F01: Refund amount must be > 0, got ${amount}`
    );
  }
  return formatRefundMoney(n);
}
