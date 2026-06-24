/**
 * THERMAL-PRINTING-13I.1J — system-managed printer profile identifiers.
 */
import { customAlphabet } from "nanoid";

const profileSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export function buildSystemPrinterProfileId(restaurantId: number): string {
  return `r${restaurantId}-printer-${profileSuffix()}`;
}

export function buildSuggestedPrintAgentId(restaurantId: number): string {
  return `mineuqr-agent-${restaurantId}`;
}
