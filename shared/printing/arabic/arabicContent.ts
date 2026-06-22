/**
 * THERMAL-PRINTING-13D — Arabic script detection for hybrid rendering.
 */
import { PRINT_TICKET_LOCALE } from "../types";
import type { Receipt } from "../receipts/receiptTypes";

const ARABIC_SCRIPT_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsArabicScript(text: string): boolean {
  return ARABIC_SCRIPT_PATTERN.test(text);
}

function collectReceiptText(receipt: Receipt): string[] {
  const parts: string[] = [
    receipt.header.title,
    receipt.metadata.orderNumber,
    receipt.metadata.tableNumber ?? "",
    receipt.metadata.sessionId != null ? String(receipt.metadata.sessionId) : "",
    receipt.notes?.orderNotes ?? "",
    receipt.totals?.subtotal ?? "",
    receipt.totals?.total ?? "",
    receipt.totals?.currency ?? "",
  ];

  for (const item of receipt.items) {
    parts.push(item.name, item.notes ?? "", item.unitPrice ?? "");
  }

  return parts;
}

export function receiptContainsArabicScript(receipt: Receipt): boolean {
  return collectReceiptText(receipt).some((part) => containsArabicScript(part));
}

export function receiptRequiresArabicRendering(receipt: Receipt): boolean {
  if (
    receipt.locale === PRINT_TICKET_LOCALE.AR ||
    receipt.locale === PRINT_TICKET_LOCALE.BILINGUAL
  ) {
    return true;
  }
  return receiptContainsArabicScript(receipt);
}
