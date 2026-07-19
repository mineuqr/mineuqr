import { describe, expect, it } from "vitest";
import { presentationalNote } from "../presentationalNote";
import {
  mapActiveOrderPresentation,
  mapKitchenTicketPresentation,
} from "../mapOrderPresentation";
import type { KitchenTicketDto } from "@/lib/kitchen/types";
import { mockCategoryProjection } from "@/lib/operational-screen/__tests__/fixtures/categoryProjectionFixtures";

function kitchenTicket(
  overrides: Partial<KitchenTicketDto> = {}
): KitchenTicketDto {
  return {
    orderId: 100,
    orderNumber: "ORD-0100",
    businessDay: "2026-07-14",
    dailyDisplayNumber: 3,
    displayOrderNumber: "003",
    displayReference: "003",
    tableNumber: 2,
    sessionId: null,
    serviceMode: "table_service",
    fulfilmentAnchorType: "table",
    fulfilmentLabel: "2",
    customerName: null,
    orderNotes: null,
    status: "pending",
    totalAmount: "20.00",
    createdAt: "2026-07-14 10:00:00",
    readyAt: null,
    statusEnteredAt: "2026-07-14 10:00:00",
    elapsedSeconds: 120,
    columnElapsedSeconds: 120,
    urgencyTier: "normal",
    lineCount: 2,
    linesSummary: "2 items",
    lineItems: [
      {
        projectionType: "MenuItem",
        lineItemId: 1,
        menuItemId: 10,
        quantity: 1,
        nameAr: "شاورما",
        nameEn: "Shawarma",
        price: "10.00",
        itemNotes: null,
        modifiers: [],
        category: mockCategoryProjection({ categoryId: 1, categoryCode: "mains" }),
      },
      {
        projectionType: "MenuItem",
        lineItemId: 2,
        menuItemId: 11,
        quantity: 2,
        nameAr: "حمص",
        nameEn: "Hummus",
        price: "5.00",
        itemNotes: null,
        modifiers: [],
        category: mockCategoryProjection({ categoryId: 2, categoryCode: "sides" }),
      },
    ],
    lastEventId: null,
    ...overrides,
  };
}

const baseActive = {
  orderId: 42,
  orderNumber: "ORD-0042",
  businessDay: "2026-07-14",
  dailyDisplayNumber: 6,
  displayOrderNumber: "006",
  displayReference: "006",
  status: "preparing",
  lifecycle: "active",
  tableNumber: 3,
  sessionId: null as number | null,
  serviceMode: "table_service",
  fulfilmentAnchorType: "table",
  fulfilmentLabel: "3",
  customerName: "Sam",
  customerPhone: null as string | null,
  notes: null as string | null,
  totalAmount: "45.00",
  createdAt: "2026-07-14 10:00:00",
  readyAt: null as string | null,
  lineItems: [
    {
      lineItemId: 1,
      quantity: 2,
      nameAr: "تبولة",
      nameEn: "Tabbouleh",
      itemNotes: null as string | null,
    },
  ],
};

describe("ORDERING-OPERATIONAL-NOTES-PRESENTATION-1", () => {
  describe("presentationalNote", () => {
    it("returns null for absent blank and whitespace-only notes", () => {
      expect(presentationalNote(null)).toBeNull();
      expect(presentationalNote(undefined)).toBeNull();
      expect(presentationalNote("")).toBeNull();
      expect(presentationalNote("   ")).toBeNull();
    });

    it("trims projected notes without inventing content", () => {
      expect(presentationalNote("  Extra sauce  ")).toBe("Extra sauce");
    });
  });

  describe("mapActiveOrderPresentation notes", () => {
    it("maps order without notes to null (no placeholders)", () => {
      const p = mapActiveOrderPresentation(baseActive);
      expect(p.notes).toBeNull();
      expect(p.items.lines[0]?.itemNotes).toBeNull();
    });

    it("maps order notes only once at presentation root", () => {
      const p = mapActiveOrderPresentation({
        ...baseActive,
        notes: "No onions",
      });
      expect(p.notes).toBe("No onions");
      expect(p.items.lines.every((l) => l.itemNotes == null)).toBe(true);
    });

    it("maps item notes beneath owning lines only", () => {
      const p = mapActiveOrderPresentation({
        ...baseActive,
        lineItems: [
          {
            lineItemId: 1,
            quantity: 1,
            nameAr: "تبولة",
            nameEn: "Tabbouleh",
            itemNotes: "بدون زيت",
          },
          {
            lineItemId: 2,
            quantity: 1,
            nameAr: "فتوش",
            nameEn: "Fattoush",
            itemNotes: null,
          },
        ],
      });
      expect(p.notes).toBeNull();
      expect(p.items.lines[0]?.itemNotes).toBe("بدون زيت");
      expect(p.items.lines[1]?.itemNotes).toBeNull();
    });

    it("maps mixed order + item notes without duplicating order notes onto lines", () => {
      const p = mapActiveOrderPresentation({
        ...baseActive,
        notes: "Deliver together",
        lineItems: [
          {
            lineItemId: 1,
            quantity: 1,
            nameAr: "وجبة",
            nameEn: "Meal",
            itemNotes: "  Spicy  ",
          },
        ],
      });
      expect(p.notes).toBe("Deliver together");
      expect(p.items.lines[0]?.itemNotes).toBe("Spicy");
    });

    it("preserves long wrapping notes as projected text", () => {
      const long = "Please cut into eight thin slices and wrap separately for takeaway guests";
      const p = mapActiveOrderPresentation({
        ...baseActive,
        notes: long,
        lineItems: [
          {
            lineItemId: 1,
            quantity: 1,
            nameAr: "بيتزا",
            nameEn: "Pizza",
            itemNotes: long,
          },
        ],
      });
      expect(p.notes).toBe(long);
      expect(p.items.lines[0]?.itemNotes).toBe(long);
    });
  });

  describe("mapKitchenTicketPresentation notes", () => {
    it("maps kitchen orderNotes and per-line itemNotes", () => {
      const ticket = kitchenTicket({
        orderNotes: "Table wants extra bread",
        lineItems: [
          {
            ...kitchenTicket().lineItems[0]!,
            itemNotes: "No garlic",
          },
          {
            ...kitchenTicket().lineItems[1]!,
            itemNotes: null,
          },
        ],
      });
      const p = mapKitchenTicketPresentation(ticket);
      expect(p.notes).toBe("Table wants extra bread");
      expect(p.items.lines[0]?.itemNotes).toBe("No garlic");
      expect(p.items.lines[1]?.itemNotes).toBeNull();
    });

    it("supports RTL Arabic projected notes without transforming them", () => {
      const p = mapKitchenTicketPresentation(
        kitchenTicket({
          orderNotes: "بدون بصل نهائيًا",
          lineItems: [
            {
              ...kitchenTicket().lineItems[0]!,
              itemNotes: "حار جدًا",
            },
          ],
        })
      );
      expect(p.notes).toBe("بدون بصل نهائيًا");
      expect(p.items.lines[0]?.itemNotes).toBe("حار جدًا");
    });
  });
});
