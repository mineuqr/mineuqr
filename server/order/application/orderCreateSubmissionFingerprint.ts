/**
 * ORDER-CREATE-SUBMISSION-IDEMPOTENCY-SCHEMA-AND-HARDENING-1
 * Canonical fingerprint for public Table/QR order.create.
 * Server-authoritative: ignores client-supplied unit amounts and session secrets.
 */

import { createHash } from "node:crypto";

export type OrderCreateFingerprintItem = {
  menuItemId: number;
  quantity: number;
  notes?: string | null;
  modifiers?: readonly string[] | null;
};

export type OrderCreateFingerprintInput = {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  items: readonly OrderCreateFingerprintItem[];
};

function normalizeText(value: string | null | undefined): string {
  return value == null ? "" : value.trim();
}

export function fingerprintOrderCreateSubmission(
  input: OrderCreateFingerprintInput
): string {
  const canonical = {
    restaurantId: input.restaurantId,
    tableId: input.tableId,
    tableNumber: input.tableNumber,
    customerName: normalizeText(input.customerName),
    customerPhone: normalizeText(input.customerPhone),
    notes: normalizeText(input.notes),
    items: [...input.items]
      .map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: normalizeText(item.notes),
        modifiers: [...(item.modifiers ?? [])]
          .map((modifier) => modifier.trim())
          .filter((modifier) => modifier.length > 0)
          .sort(),
      }))
      .sort((a, b) => {
        if (a.menuItemId !== b.menuItemId) return a.menuItemId - b.menuItemId;
        if (a.quantity !== b.quantity) return a.quantity - b.quantity;
        if (a.notes !== b.notes) return a.notes.localeCompare(b.notes);
        return a.modifiers.join("\0").localeCompare(b.modifiers.join("\0"));
      }),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function hashOrderCreateSubmissionIdForLog(submissionId: string): string {
  return createHash("sha256").update(submissionId).digest("hex").slice(0, 16);
}
