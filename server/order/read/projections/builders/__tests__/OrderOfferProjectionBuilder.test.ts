import { describe, expect, it } from "vitest";
import { OrderOfferProjectionBuilder } from "../OrderOfferProjectionBuilder";
import { ORDER_LINE_PROJECTION_TYPE_OFFER } from "../../../domain/contracts/lineProjectionContracts";

describe("OrderOfferProjectionBuilder", () => {
  const builder = new OrderOfferProjectionBuilder();

  it("builds canonical offer projection from order line snapshot", () => {
    const projection = builder.buildFromOrderLine({
      id: 99,
      orderId: 1,
      menuItemId: 0,
      nameAr: "عرض خاص",
      nameEn: "Special Offer",
      price: "25.00",
      quantity: 1,
      notes: null,
      createdAt: "2026-06-27 10:00:00",
    });

    expect(projection.lineKind).toBe("offer");
    expect(projection.offerId).toBeNull();
    expect(projection.titleAr).toBe("عرض خاص");
    expect(projection.titleEn).toBe("Special Offer");
    expect(projection.source).toBe("order_line_snapshot");
    expect(Object.isFrozen(projection)).toBe(true);
  });

  it("never fabricates category or menu item data", () => {
    const projection = builder.buildFromSnapshot({
      titleAr: "Combo",
      titleEn: null,
      updatedAt: "2026-06-27 10:00:00",
    });

    expect(projection).not.toHaveProperty("categoryId");
    expect(projection).not.toHaveProperty("categoryName");
    expect(ORDER_LINE_PROJECTION_TYPE_OFFER).toBe("Offer");
  });
});
