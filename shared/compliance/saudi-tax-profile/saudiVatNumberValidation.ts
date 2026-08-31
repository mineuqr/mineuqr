/**
 * SAUDI-TAX-PROFILE-1
 * Structural Saudi VAT registration number validation.
 *
 * Official ZATCA Phase 1 materials require seller VAT registration number on
 * Tax Invoices / Simplified Tax Invoices for VAT-registered taxpayers.
 * Public ZATCA examples use 15-digit numbers beginning with 3.
 *
 * Checksum / remote verification against ZATCA is NOT implemented here.
 */

import type { SaudiVatNumberValidationOutcome } from "./saudiTaxProfileContract";

/** Digits-only length observed in official ZATCA simplified e-invoice examples. */
export const SAUDI_VAT_NUMBER_STRUCTURAL_LENGTH = 15 as const;

export function normalizeSaudiVatNumberInput(
  input: string | null | undefined
): string {
  if (input == null) return "";
  return input.replace(/\s+/g, "").trim();
}

/**
 * Structural validation only:
 * - empty
 * - malformed (not 15 digits starting with 3)
 * - structurally_valid
 *
 * Does not implement checksum algorithms or ZATCA remote lookup.
 */
export function validateSaudiVatNumberStructure(
  input: string | null | undefined
): SaudiVatNumberValidationOutcome {
  const normalized = normalizeSaudiVatNumberInput(input);
  if (normalized.length === 0) return "empty";
  if (!/^\d{15}$/.test(normalized)) return "malformed";
  if (!normalized.startsWith("3")) return "malformed";
  return "structurally_valid";
}
