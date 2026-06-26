/**
 * PRINTING-RENDERING-1B — Arabic rendering detection for TicketDocument.
 */
import {
  containsArabicScript,
  receiptRequiresArabicRendering,
} from "../../arabic/arabicContent";
import {
  DEFAULT_ARABIC_RENDERING_MODE,
  type ArabicRenderingMode,
} from "../../arabic/arabicRenderingMode";
import { RECEIPT_KIND, type Receipt } from "../../receipts/receiptTypes";
import { TICKET_BLOCK_KIND } from "../ticketBlocks";
import type { TicketDocument } from "../ticketTypes";

function collectTicketDocumentText(document: TicketDocument): string[] {
  const parts: string[] = [document.identity.orderNumber];

  for (const block of document.blocks) {
    switch (block.kind) {
      case TICKET_BLOCK_KIND.ITEM:
        parts.push(block.name, block.notes ?? "");
        break;
      case TICKET_BLOCK_KIND.NOTE:
        parts.push(block.text);
        break;
      case TICKET_BLOCK_KIND.METADATA:
        for (const field of block.fields) {
          parts.push(field.value);
        }
        break;
      default:
        break;
    }
  }

  return parts;
}

export function ticketDocumentContainsArabicScript(document: TicketDocument): boolean {
  return collectTicketDocumentText(document).some((part) => containsArabicScript(part));
}

export function ticketDocumentRequiresArabicRendering(
  document: TicketDocument,
  arabicRenderingMode: ArabicRenderingMode = DEFAULT_ARABIC_RENDERING_MODE
): boolean {
  if (arabicRenderingMode === "disabled" || arabicRenderingMode === "escpos-codepage") {
    return false;
  }
  if (arabicRenderingMode === "raster") {
    return true;
  }

  const shim: Receipt = {
    kind: RECEIPT_KIND.KITCHEN_ORDER,
    locale: document.locale,
    layoutDirection: document.layoutDirection,
    defaultTextDirection: document.defaultTextDirection,
    restaurantId: document.restaurantId,
    orderId: document.identity.orderId,
    header: { title: "" },
    metadata: {
      orderNumber: document.identity.orderNumber,
      createdAt: new Date(0),
    },
    items: document.blocks
      .filter((block) => block.kind === TICKET_BLOCK_KIND.ITEM)
      .map((block) => ({
        quantity: block.quantity,
        name: block.name,
        notes: block.notes ?? null,
      })),
    footer: { feedLines: 0, cut: false },
  };

  return receiptRequiresArabicRendering(shim);
}
