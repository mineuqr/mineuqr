import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mapActiveOrderPresentation,
  mapKitchenTicketPresentation,
} from "../mapOrderPresentation";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-WORKSPACE-CARD-ARCHITECTURE-1 presentation mapper", () => {
  const baseOrder = {
    orderId: 42,
    orderNumber: "ORD-0042",
    businessDay: "2026-07-11",
    dailyDisplayNumber: 6,
    displayOrderNumber: "006",
    displayReference: "006",
    status: "preparing",
    lifecycle: "active",
    tableNumber: 3,
    sessionId: null,
    customerName: "Sam",
    customerPhone: "+966500000000",
    notes: "No onions",
    totalAmount: "45.00",
    createdAt: "2026-07-11 10:00:00",
    readyAt: null,
    lineItems: [
      { lineItemId: 1, quantity: 2, nameAr: "تبولة", nameEn: "Tabbouleh" },
    ],
  };

  it("maps active order read model into presentation contract", () => {
    const presentation = mapActiveOrderPresentation(baseOrder, { tableUnit: "table" });

    expect(presentation.orderId).toBe(42);
    expect(presentation.identity.displayReference).toBe("#006");
    expect(presentation.identity.displayNumber).toBe("006");
    expect(presentation.lifecycle).toBe("active");
    expect(presentation.status).toBe("preparing");
    expect(presentation.statusLabel.en).toBe("Preparing");
    expect(presentation.items.count).toBe(1);
    expect(presentation.items.summary.en).toContain("Tabbouleh");
    expect(presentation.timing.elapsedLabel.en).toMatch(/\d/);
    expect(presentation.availableActions.some((a) => a.id === "mark-ready")).toBe(true);
  });

  it("exposes lifecycle explicitly without inferring from status", () => {
    const completed = mapActiveOrderPresentation({
      ...baseOrder,
      status: "served",
      lifecycle: "completed",
    });
    expect(completed.lifecycle).toBe("completed");
    expect(completed.lifecycleLabel.en).toBe("Completed");
    expect(completed.status).toBe("served");
  });

  it("maps kitchen ticket read model into presentation contract", () => {
    const presentation = mapKitchenTicketPresentation({
      orderId: 7,
      orderNumber: "ORD-0007",
      businessDay: "2026-07-11",
      dailyDisplayNumber: 7,
      displayOrderNumber: "007",
      displayReference: "007",
      tableNumber: 5,
      sessionId: null,
      customerName: null,
      orderNotes: null,
      status: "pending",
      totalAmount: "10.00",
      createdAt: "2026-07-11 10:00:00",
      readyAt: null,
      statusEnteredAt: "2026-07-11 10:00:00",
      elapsedSeconds: 600,
      columnElapsedSeconds: 600,
      urgencyTier: "elevated",
      lineCount: 1,
      linesSummary: "1× Soup",
      lineItems: [
        {
          projectionType: "MenuItem" as const,
          lineItemId: 9,
          menuItemId: 1,
          quantity: 1,
          nameAr: "شوربة",
          nameEn: "Soup",
          price: "10.00",
          itemNotes: null,
          category: {
            categoryId: 1,
            categoryCode: "soups",
            categoryName: "Soups",
            displayOrder: 1,
            parentCategoryId: null,
            version: 1,
            updatedAt: "2026-07-11 10:00:00",
          },
        },
      ],
      lastEventId: null,
    });

    expect(presentation.identity.displayReference).toBe("#007");
    expect(presentation.lifecycle).toBe("active");
    expect(presentation.statusLabel.en).toBe("Pending");
    expect(presentation.timing.elapsedCompactLabel.en).toMatch(/min|h/);
    expect(presentation.emphasis.statusAccentClass).toContain("bg-sky-500");
    expect(presentation.availableActions[0]?.id).toBe("start-preparing");
  });

  it("KITCHEN-LIFECYCLE-OWNERSHIP-1: kitchen ticket presentation excludes mark-ready", () => {
    const presentation = mapKitchenTicketPresentation({
      orderId: 8,
      orderNumber: "ORD-0008",
      businessDay: "2026-07-11",
      dailyDisplayNumber: 8,
      displayOrderNumber: "008",
      displayReference: "008",
      tableNumber: 2,
      sessionId: null,
      customerName: null,
      orderNotes: null,
      status: "preparing",
      totalAmount: "12.00",
      createdAt: "2026-07-11 10:00:00",
      readyAt: null,
      statusEnteredAt: "2026-07-11 10:05:00",
      elapsedSeconds: 300,
      columnElapsedSeconds: 300,
      urgencyTier: "normal",
      lineCount: 1,
      linesSummary: "1× Burger",
      lineItems: [
        {
          projectionType: "MenuItem" as const,
          lineItemId: 10,
          menuItemId: 2,
          quantity: 1,
          nameAr: "برجر",
          nameEn: "Burger",
          price: "12.00",
          itemNotes: null,
          category: {
            categoryId: 1,
            categoryCode: "mains",
            categoryName: "Mains",
            displayOrder: 1,
            parentCategoryId: null,
            version: 1,
            updatedAt: "2026-07-11 10:00:00",
          },
        },
      ],
      lastEventId: null,
    });

    expect(presentation.availableActions.some((action) => action.id === "mark-ready")).toBe(false);
    expect(presentation.availableActions).toHaveLength(0);
  });
});

describe("ORDER-WORKSPACE-CARD-ARCHITECTURE-1 architecture guards", () => {
  it("centralizes business identity formatting in the presentation mapper", () => {
    const mapper = read("client/src/lib/order-presentation/mapOrderPresentation.ts");
    const ordersWorkspace = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    const operationalCard = read("client/src/components/operational-workspace/OperationalCard.tsx");

    expect(mapper).toContain("formatOperationalOrderHeading");
    expect(mapper).toContain("operationalDisplayReference");
    expect(ordersWorkspace).toContain("mapActiveOrderPresentation");
    expect(ordersWorkspace).not.toContain("formatOperationalOrderHeading");
    expect(operationalCard).not.toContain("formatOperationalOrderHeading");
    expect(operationalCard).not.toContain("explainDelay");
  });

  it("centralizes lifecycle and status presentation in the mapper", () => {
    const mapper = read("client/src/lib/order-presentation/mapOrderPresentation.ts");
    const model = read("client/src/lib/order-presentation/orderPresentationModel.ts");

    expect(model).toContain("lifecycle:");
    expect(model).toContain("lifecycleLabel");
    expect(model).toContain("statusLabel");
    expect(mapper).toContain("formatOrderStatusLabel");
    expect(mapper).toContain("resolveLifecycle");
    expect(mapper).not.toMatch(/status === "served"[\s\S]*lifecycle/);
  });

  it("order cards consume OrderPresentationModel instead of read model formatting", () => {
    const operationalCard = read("client/src/components/operational-workspace/OperationalCard.tsx");
    const kitchenCard = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    const kitchenPanel = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");

    expect(operationalCard).toContain("presentation: OrderPresentationModel");
    expect(operationalCard).toContain("presentation.identity.displayReference");
    expect(kitchenCard).toContain("presentation: OrderPresentationModel");
    expect(kitchenCard).toContain("presentation.identity.displayReference");
    expect(kitchenCard).not.toContain("explainDelay");
    expect(kitchenCard).not.toContain("formatOperationalElapsedCompact");
    expect(kitchenCard).not.toContain("operationalFooterStatusLabel");
    expect(kitchenPanel).toContain("mapKitchenTicketPresentation");
    expect(kitchenPanel).not.toContain("computeSlaSnapshot");
  });

  it("keeps presentation formatting out of card components", () => {
    const operationalCard = read("client/src/components/operational-workspace/OperationalCard.tsx");
    const kitchenCard = read("client/src/components/kitchen/KitchenExecutionCard.tsx");

    for (const source of [operationalCard, kitchenCard]) {
      expect(source).not.toContain("computeOrderCardSla");
      expect(source).not.toContain("buildLinesSummaryFromItems");
      expect(source).not.toContain("kitchenStatusPresentation");
    }
  });
});
