import { describe, expect, it } from "vitest";
import { mapKitchenTicketPresentation } from "@/lib/order-presentation/mapOrderPresentation";
import { resolveOperationalScreenAction } from "../../interaction/deviceOrderExecutionCapabilities";
import {
  EXPO_EXCLUSIVE_OPERATIONAL_LIFECYCLE_ACTIONS,
  operationalScreenExposesMarkReady,
  resolveExpoOperationalScreenAction,
  rolesExposingMarkReadyOnOperationalScreen,
} from "../expoWorkspaceContract";

describe("EXPO-WORKSPACE-ARCHITECTURE-1 capability ownership", () => {
  it("defines mark-ready as Expo-exclusive on the operational screen", () => {
    expect(EXPO_EXCLUSIVE_OPERATIONAL_LIFECYCLE_ACTIONS).toEqual(["mark-ready"]);
  });

  it("Expo is the only operational screen role exposing mark-ready", () => {
    expect(rolesExposingMarkReadyOnOperationalScreen()).toEqual(["expo_display"]);
    expect(operationalScreenExposesMarkReady("expo_display")).toBe(true);
    expect(operationalScreenExposesMarkReady("kitchen_display")).toBe(false);
    expect(operationalScreenExposesMarkReady("pickup_display")).toBe(false);
  });

  it("Expo owns mark-ready on preparing and serve-order on ready", () => {
    expect(resolveExpoOperationalScreenAction("preparing")?.id).toBe("mark-ready");
    expect(resolveExpoOperationalScreenAction("ready")?.id).toBe("serve-order");
    expect(resolveExpoOperationalScreenAction("pending")).toBeNull();
  });

  it("Kitchen exposes no completion capability on the operational screen", () => {
    expect(resolveOperationalScreenAction("kitchen_display", "pending")).toBeNull();
    expect(resolveOperationalScreenAction("kitchen_display", "preparing")).toBeNull();
    expect(resolveOperationalScreenAction("kitchen_display", "ready")).toBeNull();
  });

  it("Pickup does not expose mark-ready on the operational screen", () => {
    expect(resolveOperationalScreenAction("pickup_display", "preparing")).toBeNull();
    expect(resolveOperationalScreenAction("pickup_display", "ready")?.id).toBe("serve-order");
  });
});

describe("EXPO-WORKSPACE-ARCHITECTURE-1 presentation ownership", () => {
  const preparingTicket = {
    orderId: 9,
    orderNumber: "ORD-0009",
    businessDay: "2026-07-13",
    dailyDisplayNumber: 9,
    displayOrderNumber: "009",
    displayReference: "009",
    tableNumber: 4,
    sessionId: null,
    customerName: null,
    orderNotes: null,
    status: "preparing" as const,
    totalAmount: "15.00",
    createdAt: "2026-07-13T10:00:00.000Z",
    readyAt: null,
    statusEnteredAt: "2026-07-13T10:05:00.000Z",
    elapsedSeconds: 300,
    columnElapsedSeconds: 300,
    urgencyTier: "normal" as const,
    lineCount: 1,
    linesSummary: "1× Item",
    lineItems: [
      {
        projectionType: "MenuItem" as const,
        lineItemId: 1,
        menuItemId: 1,
        quantity: 1,
        nameAr: "صنف",
        nameEn: "Item",
        price: "15.00",
        itemNotes: null,
        category: {
          categoryId: 1,
          categoryCode: "mains",
          categoryName: "Mains",
          displayOrder: 1,
          parentCategoryId: null,
          version: 1,
          updatedAt: "2026-07-13T10:00:00.000Z",
        },
      },
    ],
    lastEventId: null,
  };

  it("shared ticket mapper does not advertise mark-ready (runtime resolver owns actions)", () => {
    const presentation = mapKitchenTicketPresentation(preparingTicket);
    expect(presentation.availableActions.some((action) => action.id === "mark-ready")).toBe(false);
  });
});
