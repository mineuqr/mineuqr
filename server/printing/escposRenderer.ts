/**
 * THERMAL-PRINTING-4B / 13B — ESC/POS kitchen ticket renderer (delegates to unified pipeline).
 */
import { renderReceiptToEscPosDocument } from "../../shared/printing/receiptPipeline";
import { receiptFromKitchenTicket } from "../../shared/printing/receipts/receiptAdapters";
import type { EscPosDocument } from "../../shared/printing/escpos/escposTypes";
import type { KitchenTicket } from "./ticketTypes";

export function renderEscPosKitchenTicket(ticket: KitchenTicket): EscPosDocument {
  const receipt = receiptFromKitchenTicket(ticket);
  return renderReceiptToEscPosDocument(receipt, {
    layoutProfileId: "legacy-v1",
    arabicRenderingMode: "disabled",
  });
}
