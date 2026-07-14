import type { PrintPayload } from "../../printing/domain/PrintPayload";

/**
 * Renderer-independent text serialization for OS print APIs.
 * Not ESC/POS, PDF, or raster — plain structured text only.
 */
export function serializePrintPayloadToText(payload: PrintPayload): string {
  const staffOrderLabel = payload.displayReference ?? payload.displayOrderNumber ?? payload.orderNumber;
  const lines: string[] = [
    `Order: ${staffOrderLabel}`,
    `Table: ${payload.tableNumber}`,
    `Status: ${payload.orderStatus}`,
    `Total: ${payload.totalAmount}`,
    `Created: ${payload.createdAt}`,
    "",
    "Items:",
  ];

  for (const item of payload.lineItems) {
    const name = item.nameEn || item.nameAr;
    lines.push(`  ${item.quantity}x ${name} @ ${item.price}`);
    const itemNotes = item.itemNotes?.trim();
    if (itemNotes) {
      lines.push(`    Note: ${itemNotes}`);
    }
  }

  if (payload.notes?.trim()) {
    lines.push("", `Notes: ${payload.notes.trim()}`);
  }

  if (payload.customerName || payload.customerPhone) {
    lines.push(
      "",
      `Customer: ${payload.customerName ?? ""} ${payload.customerPhone ?? ""}`.trim()
    );
  }

  lines.push("", `Requested: ${payload.requestedAt}`);
  return lines.join("\n");
}
