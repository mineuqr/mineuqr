import { describe, expect, it } from "vitest";
import { AGENT_TICKET_PAYLOAD_VERSION } from "../../shared/printing/agentJobMessages";
import { encodeEscPosDocument } from "../../shared/printing/escpos/escposDocumentRenderer";
import { buildEscPosPayloadFromAgentTicket } from "../../shared/printing/escposPayloadBuilder";
import { renderReceiptToEscPosPayload } from "../../shared/printing/receiptPipeline";
import { receiptFromAgentJobTicket, receiptFromKitchenTicket } from "../../shared/printing/receipts/receiptAdapters";
import { getReceiptLabels } from "../../shared/printing/receipts/receiptLabels";
import { TICKET_BLOCK_KIND } from "../../shared/printing/tickets/ticketBlocks";
import {
  buildDiagnosticTicketDocument,
  buildKitchenOrderTicketDocument,
} from "../../shared/printing/tickets/ticketBuilder";
import { ticketDocumentFromAgentPayload } from "../../shared/printing/tickets/ticketDocumentFromPayload";
import { ticketDocumentToReceipt } from "../../shared/printing/tickets/legacyReceiptAdapter";
import {
  isCanonicalAgentTicketPayload,
  ticketDocumentToAgentPayload,
} from "../../shared/printing/tickets/ticketPayload";
import {
  renderAgentTicketPayloadToEscPosPayload,
  renderTicketDocumentToEscPosPayload,
} from "../../shared/printing/tickets/ticketRenderingPipeline";
import { TICKET_DOCUMENT_KIND } from "../../shared/printing/tickets/ticketTypes";
import { PAPER_WIDTH_MM, PRINT_TICKET_LOCALE } from "../../shared/printing/types";
import { buildOrderAgentTicketPayload, buildOrderTicketDocument } from "./orderTicketBuilder";
import { buildDiagnosticTicketPayload } from "./diagnosticTicketRenderer";

const legacyMinimalTicket = {
  orderId: 500,
  restaurantId: 7,
  items: [{ itemName: "Burger", quantity: 2, notes: "No onions" }],
};

const sampleKitchenTicket = {
  ticketType: "kitchen-order" as const,
  restaurantId: 7,
  orderId: 1001,
  orderNumber: "ORD-01001",
  tableNumber: "12",
  sessionId: 55,
  createdAt: new Date("2026-06-20T12:30:00.000Z"),
  notes: "No onions",
  items: [{ itemName: "برجر", quantity: 2, notes: null }],
};

describe("PRINTING-RENDERING-1A canonical ticket platform", () => {
  it("builds a TicketDocument with identity, metadata, items, and dividers", () => {
    const document = buildKitchenOrderTicketDocument({
      restaurantId: 7,
      orderId: 1001,
      orderNumber: "ORD-01001",
      tableNumber: "12",
      sessionId: 55,
      createdAt: new Date("2026-06-20T12:30:00.000Z"),
      orderNotes: "Extra spicy",
      items: [{ itemName: "Burger", quantity: 2, notes: "No onions", modifiers: [] }],
      execution: { stationId: 3, stationName: "Grill" },
    });

    expect(document.schemaVersion).toBe(1);
    expect(document.kind).toBe(TICKET_DOCUMENT_KIND.KITCHEN_ORDER);
    expect(document.identity.orderNumber).toBe("ORD-01001");
    expect(document.execution.stationName).toBe("Grill");
    expect(document.blocks.some((block) => block.kind === TICKET_BLOCK_KIND.IDENTITY)).toBe(true);
    expect(document.blocks.filter((block) => block.kind === TICKET_BLOCK_KIND.ITEM)).toHaveLength(1);
    expect(document.blocks.filter((block) => block.kind === TICKET_BLOCK_KIND.DIVIDER).length).toBeGreaterThan(0);
  });

  it("maps order kitchen ticket through server ticket builder", () => {
    const document = buildOrderTicketDocument({
      kitchenTicket: sampleKitchenTicket,
      stationId: 3,
      stationName: "Kitchen",
    });

    expect(document.identity.orderNumber).toBe("ORD-01001");
    expect(document.execution.stationId).toBe(3);
    const itemBlock = document.blocks.find((block) => block.kind === TICKET_BLOCK_KIND.ITEM);
    expect(itemBlock).toMatchObject({
      name: "برجر",
      quantity: 2,
    });
  });

  it("serializes TicketDocument to canonical v2 agent payload", () => {
    const document = buildOrderTicketDocument({
      kitchenTicket: sampleKitchenTicket,
      stationId: null,
      stationName: null,
    });
    const payload = ticketDocumentToAgentPayload(document);

    expect(payload.payloadVersion).toBe(AGENT_TICKET_PAYLOAD_VERSION.CANONICAL);
    expect(isCanonicalAgentTicketPayload(payload)).toBe(true);
    expect(payload.orderNumber).toBe("ORD-01001");
    expect(payload.tableNumber).toBe("12");
    expect(payload.sessionId).toBe(55);
    expect(payload.orderNotes).toBe("No onions");
  });

  it("reconstructs TicketDocument from legacy v1 payload", () => {
    const document = ticketDocumentFromAgentPayload(legacyMinimalTicket, {
      createdAt: new Date("2026-06-18T10:00:00.000Z"),
    });

    expect(document.identity.orderNumber).toBe("500");
    expect(document.blocks.filter((block) => block.kind === TICKET_BLOCK_KIND.ITEM)).toHaveLength(1);
  });

  it("reconstructs TicketDocument from canonical v2 payload", () => {
    const payload = buildOrderAgentTicketPayload({
      kitchenTicket: sampleKitchenTicket,
      stationId: 8,
      stationName: "Bar",
    });
    const document = ticketDocumentFromAgentPayload(payload);

    expect(document.identity.orderNumber).toBe("ORD-01001");
    expect(document.execution.stationName).toBe("Bar");
  });

  it("adapts TicketDocument to legacy Receipt with order number as title", () => {
    const document = buildKitchenOrderTicketDocument({
      restaurantId: 7,
      orderId: 1001,
      orderNumber: "ORD-01001",
      tableNumber: "12",
      sessionId: 55,
      createdAt: new Date("2026-06-20T12:30:00.000Z"),
      orderNotes: null,
      items: [{ itemName: "Burger", quantity: 1, notes: null }],
      execution: { stationId: null, stationName: null },
    });

    const receipt = ticketDocumentToReceipt(document);
    expect(receipt.header.title).toBe("ORD-01001");
    expect(receipt.metadata.orderNumber).toBe("ORD-01001");
    expect(receipt.metadata.tableNumber).toBe("12");
  });

  it("preserves diagnostic title fallback through legacy adapter", () => {
    const document = buildDiagnosticTicketDocument({
      restaurantId: 7,
      orderId: 999001,
      lines: ["TEST LINE"],
    });
    const receipt = ticketDocumentToReceipt(document);
    expect(receipt.header.title).toBe("");
  });

  it("routes escpos payload generation through the ticket rendering pipeline", () => {
    const createdAt = new Date("2026-06-18T10:00:00.000Z");
    const pipelinePayload = buildEscPosPayloadFromAgentTicket({
      ticket: legacyMinimalTicket,
      createdAt,
    });
    const directPipeline = renderAgentTicketPayloadToEscPosPayload({
      ticket: legacyMinimalTicket,
      createdAt,
    });

    expect(Array.from(pipelinePayload.bytes)).toEqual(Array.from(directPipeline.bytes));
  });

  it("documents intentional identity change from Kitchen Order to order number for legacy v1 payloads", () => {
    const createdAt = new Date("2026-06-18T10:00:00.000Z");
    const labels = getReceiptLabels(PRINT_TICKET_LOCALE.EN);

    const legacyReceiptBytes = renderReceiptToEscPosPayload(
      receiptFromAgentJobTicket(legacyMinimalTicket, { createdAt }),
      { layoutProfileId: "legacy-v1" }
    );
    const canonicalBytes = buildEscPosPayloadFromAgentTicket({
      ticket: legacyMinimalTicket,
      createdAt,
    });

    const legacyText = new TextDecoder().decode(legacyReceiptBytes.bytes);
    const canonicalText = new TextDecoder().decode(canonicalBytes.bytes);

    expect(legacyText).toContain(labels.kitchenOrderTitle);
    expect(canonicalText).not.toContain(labels.kitchenOrderTitle);
    expect(canonicalText).toContain("ORDER #500");
    expect(Array.from(legacyReceiptBytes.bytes)).not.toEqual(Array.from(canonicalBytes.bytes));
  });

  it("matches kitchen ticket metadata bytes except approved identity title for canonical v2 payloads", () => {
    const document = buildOrderTicketDocument({
      kitchenTicket: sampleKitchenTicket,
      stationId: null,
      stationName: null,
    });
    const payload = ticketDocumentToAgentPayload(document);

    const canonicalBytes = renderTicketDocumentToEscPosPayload(document, {
      layoutProfileId: "legacy-v1",
      arabicRenderingMode: "disabled",
    });
    const kitchenReceiptBytes = renderReceiptToEscPosPayload(
      receiptFromKitchenTicket(sampleKitchenTicket),
      { layoutProfileId: "legacy-v1", arabicRenderingMode: "disabled" }
    );

    const canonicalText = new TextDecoder().decode(canonicalBytes.bytes);
    const kitchenText = new TextDecoder().decode(kitchenReceiptBytes.bytes);

    expect(canonicalText).toContain("ORDER #ORD-01001");
    expect(canonicalText).toContain("Table Number: 12");
    expect(canonicalText).toContain("برجر");
    expect(canonicalText).not.toContain("Kitchen Order");
    expect(Array.from(canonicalBytes.bytes)).not.toEqual(Array.from(kitchenReceiptBytes.bytes));

    const roundTrip = renderAgentTicketPayloadToEscPosPayload({
      ticket: payload,
      arabicRenderingMode: "disabled",
    });
    expect(Array.from(roundTrip.bytes)).toEqual(Array.from(canonicalBytes.bytes));
  });

  it("renders diagnostic tickets with legacy-compatible item lines", () => {
    const diagnosticPayload = buildDiagnosticTicketPayload({
      wireJobId: 9_000_000_001,
      restaurantId: 7,
      printerName: "Kitchen Printer",
      agentId: "agent-1",
      diagnosticId: "diag-1",
      triggeredBy: "admin",
      triggeredAt: "2026-06-20T12:00:00.000Z",
    });

    const payload = buildEscPosPayloadFromAgentTicket({
      ticket: diagnosticPayload,
      arabicRenderingMode: "disabled",
    });
    const text = new TextDecoder().decode(payload.bytes);
    expect(text).toContain("Kitchen Order");
    expect(text).toContain("1x ================================");
    expect(text).toContain("MINEUQR DIAGNOSTIC TEST");
  });

  it("renders Arabic item text through the canonical pipeline", () => {
    const payload = buildOrderAgentTicketPayload({
      kitchenTicket: sampleKitchenTicket,
      stationId: null,
      stationName: null,
    });
    const document = renderAgentTicketPayloadToEscPosPayload({
      ticket: payload,
      paperWidthMm: PAPER_WIDTH_MM.W80,
      arabicRenderingMode: "disabled",
    });
    const text = new TextDecoder().decode(document.bytes);
    expect(text).toContain("برجر");
  });
});
