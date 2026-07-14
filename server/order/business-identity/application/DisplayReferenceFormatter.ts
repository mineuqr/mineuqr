import type { DisplayReferenceFormat } from "../types";
import {
  businessIdentityScopeCode,
  type BusinessIdentityScope,
} from "./resolveBusinessIdentityScope";

export function formatDisplayOrderNumber(dailyDisplayNumber: number): string {
  return String(Math.max(1, Math.floor(dailyDisplayNumber))).padStart(3, "0");
}

/**
 * KIOSK-PRESENTATION-ADOPTION-1 — Business Identity owns scoped display strings.
 * Presentation must render this value; it must not assemble T/K/001 locally.
 */
export function formatDisplayReference(
  businessDay: string,
  dailyDisplayNumber: number,
  format: DisplayReferenceFormat = "sequence",
  identityScope: BusinessIdentityScope = "TABLE"
): string {
  const sequence = formatDisplayOrderNumber(dailyDisplayNumber);
  const code = businessIdentityScopeCode(identityScope);

  if (format === "sequence") {
    return `${code} #${sequence}`;
  }
  if (format === "day-sequence") {
    const [, month, day] = businessDay.split("-");
    return `${code} #${day}-${month}-${sequence}`;
  }
  return `${code} #${businessDay}-${sequence}`;
}
