import { describe, expect, it } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import {
  CASHIER_POS_INBOUND_STATUS,
  isCashierPosOrderingChannel,
  nextCashierPosServeStep,
} from "../cashierPosOrderLifecycle";

describe("ORDERS-POS-KITCHEN-LIFECYCLE-1 cashier_pos lifecycle helpers", () => {
  it("identifies cashier_pos only from the canonical channel stamp", () => {
    expect(isCashierPosOrderingChannel(ORDERING_CHANNEL_CASHIER_POS)).toBe(true);
    expect(isCashierPosOrderingChannel("kiosk")).toBe(false);
    expect(isCashierPosOrderingChannel("waiter_tablet")).toBe(false);
    expect(isCashierPosOrderingChannel("table_session")).toBe(false);
    expect(isCashierPosOrderingChannel(null)).toBe(false);
  });

  it("uses existing pending → preparing as inbound acceptance", () => {
    expect(CASHIER_POS_INBOUND_STATUS).toBe("preparing");
    expect(nextCashierPosServeStep("pending")).toBe("preparing");
    expect(nextCashierPosServeStep("preparing")).toBe("ready");
    expect(nextCashierPosServeStep("ready")).toBe("served");
    expect(nextCashierPosServeStep("served")).toBeNull();
    expect(nextCashierPosServeStep("cancelled")).toBeNull();
  });
});
