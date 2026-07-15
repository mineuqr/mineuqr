/**
 * WAITER-SESSION-BINDING-HARDENING-1 — waiter binding validation policy.
 *
 * Session Platform owns validity (public getByToken / getActiveByTable).
 * Waiter channel only classifies the URL binding and reacts.
 * Does NOT adopt a replacement session (unlike QR recoverDiningSession).
 */

export type WaiterBoundSessionSnapshot = Readonly<{
  sessionToken: string;
  status: string;
  tableNumber: number;
}>;

export type WaiterSessionBinding = Readonly<{
  slug: string;
  tableNumber: number;
  sessionId: number;
  sessionToken: string;
}>;

export type WaiterBindingInvalidReason =
  | "missing_token"
  | "not_found"
  | "table_mismatch"
  | "session_closed"
  | "no_active_session"
  | "session_replaced";

export type WaiterBindingValidationResult =
  | { ok: true }
  | { ok: false; reason: WaiterBindingInvalidReason };

const TERMINAL = new Set(["closed", "paid", "complimentary"]);

/**
 * Validate waiter URL binding against Session Platform public snapshots.
 * Requires the bound token to still be the table's open active session.
 */
export function validateWaiterSessionBinding(input: {
  binding: WaiterSessionBinding;
  byToken: WaiterBoundSessionSnapshot | null;
  activeByTable: WaiterBoundSessionSnapshot | null;
}): WaiterBindingValidationResult {
  const { binding, byToken, activeByTable } = input;

  if (!binding.sessionToken.trim() || binding.tableNumber <= 0) {
    return { ok: false, reason: "missing_token" };
  }

  if (!byToken) {
    return { ok: false, reason: "not_found" };
  }

  if (byToken.tableNumber !== binding.tableNumber) {
    return { ok: false, reason: "table_mismatch" };
  }

  if (byToken.status !== "open" || TERMINAL.has(byToken.status)) {
    return { ok: false, reason: "session_closed" };
  }

  if (!activeByTable || activeByTable.status !== "open") {
    return { ok: false, reason: "no_active_session" };
  }

  if (activeByTable.sessionToken !== binding.sessionToken) {
    return { ok: false, reason: "session_replaced" };
  }

  if (activeByTable.tableNumber !== binding.tableNumber) {
    return { ok: false, reason: "table_mismatch" };
  }

  return { ok: true };
}

export function waiterBindingInvalidMessage(
  reason: WaiterBindingInvalidReason,
  language: "ar" | "en"
): string {
  if (language === "ar") {
    switch (reason) {
      case "session_closed":
      case "no_active_session":
        return "انتهت جلسة الطاولة. اختر الطاولة مجدداً.";
      case "session_replaced":
        return "تم استبدال جلسة الطاولة. اختر الطاولة مجدداً.";
      case "table_mismatch":
        return "جلسة الطاولة غير متطابقة. اختر الطاولة مجدداً.";
      default:
        return "جلسة الطاولة غير صالحة. اختر الطاولة مجدداً.";
    }
  }
  switch (reason) {
    case "session_closed":
    case "no_active_session":
      return "This table session has ended. Select the table again.";
    case "session_replaced":
      return "This table session was replaced. Select the table again.";
    case "table_mismatch":
      return "Session does not match this table. Select the table again.";
    default:
      return "Table session is no longer valid. Select the table again.";
  }
}
