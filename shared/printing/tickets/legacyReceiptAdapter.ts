/**
 * PRINTING-RENDERING-1A — Legacy Renderer Adapter (TicketDocument → Receipt).
 *
 * Bridges the canonical TicketDocument to the existing Receipt-based renderer
 * without changing ESC/POS encoding behavior.
 */
import { RECEIPT_KIND, type Receipt, type ReceiptItem, type ReceiptTotals } from "../receipts/receiptTypes";
import { getReceiptLabels } from "../receipts/receiptLabels";
import { TICKET_BLOCK_KIND } from "./ticketBlocks";
import type { TicketBlock } from "./ticketBlocks";
import { TICKET_DOCUMENT_KIND, type TicketDocument } from "./ticketTypes";

export type LegacyReceiptAdapterOptions = {
  paperWidthMm?: Receipt["paperWidthMm"];
};

function flattenItemBlocks(blocks: TicketBlock[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  for (const block of blocks) {
    if (block.kind === TICKET_BLOCK_KIND.ITEM) {
      items.push({
        quantity: block.quantity,
        name: block.name,
        notes: block.notes ?? null,
        unitPrice: block.unitPrice ?? null,
      });
    }
    if (block.kind === TICKET_BLOCK_KIND.SECTION) {
      items.push(...flattenItemBlocks(block.blocks));
    }
  }

  return items;
}

function findOrderNotes(blocks: TicketBlock[]): string | null {
  for (const block of blocks) {
    if (block.kind === TICKET_BLOCK_KIND.NOTE && block.scope === "order") {
      return block.text;
    }
    if (block.kind === TICKET_BLOCK_KIND.SECTION) {
      const nested = findOrderNotes(block.blocks);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function findMetadataField(blocks: TicketBlock[], key: string): string | undefined {
  for (const block of blocks) {
    if (block.kind === TICKET_BLOCK_KIND.METADATA) {
      const field = block.fields.find((entry) => entry.key === key);
      if (field) {
        return field.value;
      }
    }
    if (block.kind === TICKET_BLOCK_KIND.SECTION) {
      const nested = findMetadataField(block.blocks, key);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function parseSessionId(value: string | undefined): number | null {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseCreatedAt(value: string | undefined): Date {
  if (!value) {
    return new Date(0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function buildTotals(blocks: TicketBlock[], labels: ReturnType<typeof getReceiptLabels>): ReceiptTotals | undefined {
  for (const block of blocks) {
    if (block.kind !== TICKET_BLOCK_KIND.TOTALS) {
      continue;
    }

    const subtotal = block.lines.find((line) => line.key === "subtotal");
    const total = block.lines.find((line) => line.key === "total");
    if (!subtotal && !total) {
      return undefined;
    }

    return {
      subtotal: subtotal?.amount ?? null,
      total: total?.amount ?? null,
      currency: total?.currency ?? subtotal?.currency ?? null,
    };
  }

  return undefined;
}

function resolveReceiptKind(document: TicketDocument): (typeof RECEIPT_KIND)[keyof typeof RECEIPT_KIND] {
  if (document.kind === TICKET_DOCUMENT_KIND.KITCHEN_ORDER) {
    return RECEIPT_KIND.KITCHEN_ORDER;
  }
  return RECEIPT_KIND.KITCHEN_ORDER;
}

function resolveHeaderTitle(document: TicketDocument): string {
  if (document.kind === TICKET_DOCUMENT_KIND.DIAGNOSTIC) {
    return "";
  }

  const identityBlock = document.blocks.find(
    (block) => block.kind === TICKET_BLOCK_KIND.IDENTITY
  );
  if (identityBlock?.kind === TICKET_BLOCK_KIND.IDENTITY && identityBlock.displayValue.trim()) {
    return identityBlock.displayValue.trim();
  }

  return document.identity.orderNumber;
}

/**
 * Converts a canonical TicketDocument into the legacy Receipt model consumed
 * by the existing layout engine and ESC/POS renderer.
 */
export function ticketDocumentToReceipt(
  document: TicketDocument,
  options: LegacyReceiptAdapterOptions = {}
): Receipt {
  const labels = getReceiptLabels(document.locale);
  const tableNumber = findMetadataField(document.blocks, "tableNumber") ?? null;
  const sessionId = parseSessionId(findMetadataField(document.blocks, "sessionId"));
  const createdAt = parseCreatedAt(findMetadataField(document.blocks, "createdAt"));
  const orderNotes = findOrderNotes(document.blocks);
  const totals = buildTotals(document.blocks, labels);

  return {
    kind: resolveReceiptKind(document),
    locale: document.locale,
    paperWidthMm: options.paperWidthMm ?? document.renderHints?.paperWidthMm,
    layoutDirection: document.layoutDirection,
    defaultTextDirection: document.defaultTextDirection,
    restaurantId: document.restaurantId,
    orderId: document.identity.orderId,
    header: {
      title: resolveHeaderTitle(document),
    },
    metadata: {
      orderNumber: document.identity.orderNumber,
      tableNumber,
      sessionId,
      createdAt,
    },
    items: flattenItemBlocks(document.blocks),
    totals,
    notes: orderNotes ? { orderNotes } : undefined,
    footer: {
      feedLines: document.footer.feedLines,
      cut: document.footer.cut,
    },
  };
}
