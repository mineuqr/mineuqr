import type { SelectDiningSession } from "../../drizzle/schema";

export type PublicDiningSessionStatus =
  | "open"
  | "bill_requested"
  | "payment_pending"
  | "closed";

export type PublicDiningSession = {
  sessionToken: string;
  status: PublicDiningSessionStatus;
  tableNumber: number;
  openedAt: string;
  billRequestedAt?: string | null;
  paymentPendingAt?: string | null;
};

export function toPublicDiningSession(row: SelectDiningSession): PublicDiningSession {
  return {
    sessionToken: row.sessionToken,
    status: row.status as PublicDiningSessionStatus,
    tableNumber: row.tableNumber,
    openedAt: row.openedAt,
    billRequestedAt: row.billRequestedAt ?? null,
    paymentPendingAt: row.paymentPendingAt ?? null,
  };
}

export const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function isValidSessionTokenFormat(sessionToken: string): boolean {
  return SESSION_TOKEN_PATTERN.test(sessionToken);
}
