import type { DisplayReferenceFormat } from "../types";

export function formatDisplayOrderNumber(dailyDisplayNumber: number): string {
  return String(Math.max(1, Math.floor(dailyDisplayNumber))).padStart(3, "0");
}

export function formatDisplayReference(
  businessDay: string,
  dailyDisplayNumber: number,
  format: DisplayReferenceFormat = "sequence"
): string {
  const sequence = formatDisplayOrderNumber(dailyDisplayNumber);
  if (format === "sequence") {
    return sequence;
  }
  if (format === "day-sequence") {
    const [, month, day] = businessDay.split("-");
    return `${day}-${month}-${sequence}`;
  }
  return `${businessDay}-${sequence}`;
}
