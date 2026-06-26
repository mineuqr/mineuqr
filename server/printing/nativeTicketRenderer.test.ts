import { describe, expect, it } from "vitest";
import { buildEscPosPayloadFromAgentTicket } from "../../shared/printing/escposPayloadBuilder";
import { TICKET_BLOCK_KIND } from "../../shared/printing/tickets/ticketBlocks";
import { buildKitchenOrderTicketDocument } from "../../shared/printing/tickets/ticketBuilder";
import { buildTicketLayoutPlan } from "../../shared/printing/tickets/rendering/ticketLayoutEngine";
import { TICKET_RENDERING_POLICY_ID } from "../../shared/printing/tickets/rendering/renderingPolicy";
import {
  renderTicketDocumentToEscPosPayloadLegacy,
  renderTicketDocumentToEscPosPayloadNative,
} from "../../shared/printing/tickets/rendering/nativeTicketRenderer";
import { TEXT_TYPOGRAPHY, formatOrderIdentityLine } from "../../shared/printing/tickets/rendering/typography";
import { ticketLayoutPlanToEscPosDocument } from "../../shared/printing/tickets/rendering/ticketEscPosRenderer";
import { buildDiagnosticTicketPayload } from "./diagnosticTicketRenderer";
import { renderTicketDocumentToEscPosPayload } from "../../shared/printing/tickets/ticketRenderingPipeline";

const sampleDocument = buildKitchenOrderTicketDocument({
  restaurantId: 7,
  orderId: 1027,
  orderNumber: "1027",
  tableNumber: "12",
  sessionId: 55,
  createdAt: new Date("2026-06-20T12:30:00.000Z"),
  orderNotes: "No onions",
  items: [
    {
      itemName: "Super Long Burger Name With Extra Words",
      quantity: 2,
      notes: "No pickles",
      modifiers: [{ name: "Extra cheese", quantity: 1 }],
    },
  ],
  execution: { stationId: 3, stationName: "Grill" },
});

describe("PRINTING-RENDERING-1B native ticket renderer", () => {
  it("formats order identity as ORDER #", () => {
    expect(formatOrderIdentityLine("1027")).toBe("ORDER #1027");
  });

  it("renders identity with largest typography preset", () => {
    const plan = buildTicketLayoutPlan({ document: sampleDocument });
    const identityLine = plan.lines.find((line) => line.typography === TEXT_TYPOGRAPHY.IDENTITY);

    expect(identityLine?.text).toBe("ORDER #1027");
    expect(identityLine?.alignment).toBe("center");
  });

  it("hides prices and totals under kitchen policy", () => {
    const document = buildKitchenOrderTicketDocument({
      restaurantId: 7,
      orderId: 1001,
      orderNumber: "1001",
      tableNumber: null,
      sessionId: null,
      createdAt: new Date("2026-06-20T12:30:00.000Z"),
      orderNotes: null,
      items: [
        {
          itemName: "Burger",
          quantity: 1,
          notes: null,
          modifiers: [],
        },
      ],
      execution: { stationId: null, stationName: null },
    });
    document.blocks.push({
      kind: TICKET_BLOCK_KIND.TOTALS,
      lines: [
        { key: "subtotal", label: "Subtotal", amount: "10.00", currency: "USD" },
        { key: "total", label: "Total", amount: "10.00", currency: "USD" },
      ],
    });

    const kitchenPlan = buildTicketLayoutPlan({
      document,
      policyId: TICKET_RENDERING_POLICY_ID.KITCHEN,
    });
    expect(kitchenPlan.lines.some((line) => line.text.includes("Subtotal"))).toBe(false);

    const customerPlan = buildTicketLayoutPlan({
      document,
      policyId: TICKET_RENDERING_POLICY_ID.CUSTOMER_RECEIPT,
    });
    expect(customerPlan.lines.some((line) => line.text.includes("Subtotal"))).toBe(true);
  });

  it("does not render station metadata under default kitchen policy", () => {
    const kitchenPlan = buildTicketLayoutPlan({
      document: sampleDocument,
      policyId: TICKET_RENDERING_POLICY_ID.KITCHEN,
    });
    expect(kitchenPlan.lines.some((line) => line.text.includes("Station"))).toBe(false);
  });

  it("wraps long item names when policy allows wrapping", () => {
    const plan = buildTicketLayoutPlan({ document: sampleDocument });
    const itemLines = plan.lines.filter((line) => line.typography === TEXT_TYPOGRAPHY.ITEM_NAME);
    expect(itemLines.length).toBeGreaterThan(1);
  });

  it("renders modifiers indented under items", () => {
    const plan = buildTicketLayoutPlan({ document: sampleDocument });
    const modifierLine = plan.lines.find((line) => line.typography === TEXT_TYPOGRAPHY.MODIFIER);
    expect(modifierLine?.text).toContain("+ Extra cheese");
    expect(modifierLine?.indentColumns).toBe(2);
  });

  it("renders order notes in a separated note block", () => {
    const plan = buildTicketLayoutPlan({ document: sampleDocument });
    const noteLines = plan.lines.filter((line) => line.typography === TEXT_TYPOGRAPHY.NOTE);
    expect(noteLines.some((line) => line.text === "No onions")).toBe(true);
  });

  it("emits styled ESC/POS commands for identity lines", () => {
    const plan = buildTicketLayoutPlan({ document: sampleDocument });
    const document = ticketLayoutPlanToEscPosDocument(plan);
    const identityCommand = document.commands.find(
      (command) => command.type === "text" && command.value === "ORDER #1027"
    );

    expect(identityCommand?.type).toBe("text");
    if (identityCommand?.type === "text") {
      expect(identityCommand.style).toEqual({
        bold: true,
        doubleWidth: true,
        doubleHeight: true,
      });
    }
  });

  it("uses native renderer as primary pipeline path", () => {
    const payload = buildEscPosPayloadFromAgentTicket({
      ticket: { orderId: 500, restaurantId: 7, items: [{ itemName: "Burger", quantity: 1 }] },
      createdAt: new Date("2026-06-18T10:00:00.000Z"),
    });
    const direct = renderTicketDocumentToEscPosPayload(
      buildKitchenOrderTicketDocument({
        restaurantId: 7,
        orderId: 500,
        orderNumber: "500",
        tableNumber: null,
        sessionId: null,
        createdAt: new Date("2026-06-18T10:00:00.000Z"),
        orderNotes: null,
        items: [{ itemName: "Burger", quantity: 1, notes: null }],
        execution: { stationId: null, stationName: null },
      })
    );

    expect(Array.from(payload.bytes)).toEqual(Array.from(direct.bytes));
  });

  it("differs from legacy adapter by styled ORDER identity", () => {
    const createdAt = new Date("2026-06-18T10:00:00.000Z");
    const native = renderTicketDocumentToEscPosPayloadNative(
      buildKitchenOrderTicketDocument({
        restaurantId: 7,
        orderId: 500,
        orderNumber: "500",
        tableNumber: null,
        sessionId: null,
        createdAt,
        orderNotes: null,
        items: [{ itemName: "Burger", quantity: 1, notes: null }],
        execution: { stationId: null, stationName: null },
      }),
      { layoutProfileId: "legacy-v1" }
    );
    const legacy = renderTicketDocumentToEscPosPayloadLegacy(
      buildKitchenOrderTicketDocument({
        restaurantId: 7,
        orderId: 500,
        orderNumber: "500",
        tableNumber: null,
        sessionId: null,
        createdAt,
        orderNotes: null,
        items: [{ itemName: "Burger", quantity: 1, notes: null }],
        execution: { stationId: null, stationName: null },
      }),
      { layoutProfileId: "legacy-v1" }
    );

    const nativeText = new TextDecoder().decode(native.bytes);
    expect(nativeText).toContain("ORDER #500");
    expect(Array.from(native.bytes)).not.toEqual(Array.from(legacy.bytes));
  });

  it("preserves diagnostic ticket output through native renderer", () => {
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
    expect(text).toContain("MINEUQR DIAGNOSTIC TEST");
  });

  it("shows unit prices only under customer receipt policy", () => {
    const document = buildKitchenOrderTicketDocument({
      restaurantId: 7,
      orderId: 1,
      orderNumber: "1",
      tableNumber: null,
      sessionId: null,
      createdAt: new Date("2026-06-20T12:00:00.000Z"),
      orderNotes: null,
      items: [{ itemName: "Burger", quantity: 1, notes: null, modifiers: [] }],
      execution: { stationId: null, stationName: null },
    });

    const itemBlock = document.blocks.find((block) => block.kind === TICKET_BLOCK_KIND.ITEM);
    if (itemBlock?.kind === TICKET_BLOCK_KIND.ITEM) {
      itemBlock.unitPrice = "$9.50";
    }

    const kitchenPlan = buildTicketLayoutPlan({
      document,
      policyId: TICKET_RENDERING_POLICY_ID.KITCHEN,
    });
    expect(kitchenPlan.lines.some((line) => line.text.includes("$9.50"))).toBe(false);

    const customerPlan = buildTicketLayoutPlan({
      document,
      policyId: TICKET_RENDERING_POLICY_ID.CUSTOMER_RECEIPT,
    });
    expect(customerPlan.lines.some((line) => line.text.includes("$9.50"))).toBe(true);
  });
});
