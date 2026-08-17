/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Maps existing Register/Shift POS errors for Cashier presentation.
 * Does not bypass the requirement. Does not open a shift from Cashier.
 */

export type CashierRegisterGapKind =
  | "shift_required"
  | "register_required"
  | "register_closed";

export function classifyCashierRegisterGap(
  error: unknown
): CashierRegisterGapKind | null {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (message.includes("Financial Shift")) return "shift_required";
  if (
    message.includes("Register is not open") ||
    message.includes("Register is not active")
  ) {
    return "register_closed";
  }
  if (
    message.includes("Register is required") ||
    message.includes("Register/Shift")
  ) {
    return "register_required";
  }
  return null;
}
