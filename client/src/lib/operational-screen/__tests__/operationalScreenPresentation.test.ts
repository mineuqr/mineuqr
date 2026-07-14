import { describe, expect, it } from "vitest";
import {
  countDelayedKitchenTickets,
  headerConnectionLabel,
  kitchenIdleCopy,
  resolveHeaderConnectionTone,
  sortKitchenTicketsForDisplay,
} from "../operationalScreenPresentation";
import type { KitchenTicketDto } from "@/lib/kitchen/types";

function ticket(
  partial: Partial<KitchenTicketDto> & Pick<KitchenTicketDto, "orderId" | "urgencyTier" | "columnElapsedSeconds">
): KitchenTicketDto {
  return {
    orderId: partial.orderId,
    orderNumber: partial.orderNumber ?? "ORD-1",
    businessDay: partial.businessDay ?? null,
    dailyDisplayNumber: partial.dailyDisplayNumber ?? null,
    displayOrderNumber: partial.displayOrderNumber ?? "001",
    displayReference: partial.displayReference ?? "001",
    tableNumber: partial.tableNumber ?? 1,
    sessionId: null,
    serviceMode: partial.serviceMode ?? "table_service",
    fulfilmentAnchorType: partial.fulfilmentAnchorType ?? "table",
    fulfilmentLabel: partial.fulfilmentLabel ?? String(partial.tableNumber ?? 1),
    customerName: null,
    orderNotes: null,
    status: partial.status ?? "preparing",
    totalAmount: "10.00",
    createdAt: "2026-07-04T10:00:00",
    readyAt: null,
    statusEnteredAt: "2026-07-04T10:05:00",
    elapsedSeconds: partial.elapsedSeconds ?? 600,
    columnElapsedSeconds: partial.columnElapsedSeconds,
    urgencyTier: partial.urgencyTier,
    lineCount: 1,
    linesSummary: "1× Item",
    lineItems: [],
    lastEventId: null,
  };
}

describe("operationalScreenPresentation", () => {
  it("sorts tickets by urgency then elapsed time", () => {
    const sorted = sortKitchenTicketsForDisplay([
      ticket({ orderId: 1, urgencyTier: "normal", columnElapsedSeconds: 100 }),
      ticket({ orderId: 2, urgencyTier: "critical", columnElapsedSeconds: 50 }),
      ticket({ orderId: 3, urgencyTier: "elevated", columnElapsedSeconds: 200 }),
    ]);
    expect(sorted.map((t) => t.orderId)).toEqual([2, 3, 1]);
  });

  it("provides kitchen idle copy", () => {
    expect(kitchenIdleCopy(false).title).toBe("Kitchen Ready");
    expect(kitchenIdleCopy(true).subtitle).toContain("طلبات");
  });

  it("counts delayed tickets from urgency tier", () => {
    expect(
      countDelayedKitchenTickets([
        ticket({ orderId: 1, urgencyTier: "normal", columnElapsedSeconds: 100 }),
        ticket({ orderId: 2, urgencyTier: "critical", columnElapsedSeconds: 50 }),
        ticket({ orderId: 3, urgencyTier: "elevated", columnElapsedSeconds: 200 }),
      ])
    ).toBe(2);
  });

  it("maps header connection tone labels", () => {
    expect(headerConnectionLabel("live", false)).toBe("Live");
    expect(headerConnectionLabel("offline", true)).toBe("غير متصل");
    expect(
      resolveHeaderConnectionTone({
        operationalState: "operational",
        connectivityState: "connected",
      } as never)
    ).toBe("live");
  });
});
