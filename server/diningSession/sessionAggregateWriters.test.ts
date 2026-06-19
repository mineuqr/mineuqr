import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  updateSessionAggregates: vi.fn(),
  findSessionById: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getOrdersBySessionId: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("./sessionRepository", () => ({
  updateSessionAggregates: (...args: unknown[]) =>
    repoMocks.updateSessionAggregates(...args),
  findSessionById: (...args: unknown[]) => repoMocks.findSessionById(...args),
}));

vi.mock("../db", () => ({
  getOrdersBySessionId: (...args: unknown[]) =>
    dbMocks.getOrdersBySessionId(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsMocks.opsLog(...args),
}));

import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  incrementSessionAggregatesForOrder,
  logSessionAggregateDriftIfAny,
} from "./sessionAggregateWriters";
import { DiningSessionValidationError } from "./sessionTypes";

describe("sessionAggregateWriters SESSION-AGGREGATES-1 Phase A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.updateSessionAggregates.mockResolvedValue(undefined);
    repoMocks.findSessionById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      totalOrders: 1,
      totalAmount: "20.00",
    });
    dbMocks.getOrdersBySessionId.mockResolvedValue([
      { id: 55, orderNumber: "ORD-1", status: "pending", totalAmount: "20.00", createdAt: "x" },
    ]);
  });

  describe("incrementSessionAggregatesForOrder", () => {
    it("increments aggregates for first order in session", async () => {
      await incrementSessionAggregatesForOrder({
        restaurantId: 1,
        sessionId: 10,
        orderTotalAmount: "20.00",
      });

      expect(repoMocks.updateSessionAggregates).toHaveBeenCalledWith({
        restaurantId: 1,
        sessionId: 10,
        totalOrdersDelta: 1,
        totalAmountDelta: "20.00",
      });
    });

    it("supports multiple orders in same session", async () => {
      await incrementSessionAggregatesForOrder({
        restaurantId: 1,
        sessionId: 10,
        orderTotalAmount: "15.50",
      });
      await incrementSessionAggregatesForOrder({
        restaurantId: 1,
        sessionId: 10,
        orderTotalAmount: "30.00",
      });

      expect(repoMocks.updateSessionAggregates).toHaveBeenCalledTimes(2);
      expect(repoMocks.updateSessionAggregates).toHaveBeenNthCalledWith(2, {
        restaurantId: 1,
        sessionId: 10,
        totalOrdersDelta: 1,
        totalAmountDelta: "30.00",
      });
    });

    it("scopes updates per session (multiple sessions)", async () => {
      await incrementSessionAggregatesForOrder({
        restaurantId: 1,
        sessionId: 10,
        orderTotalAmount: "10.00",
      });
      await incrementSessionAggregatesForOrder({
        restaurantId: 1,
        sessionId: 11,
        orderTotalAmount: "25.00",
      });

      expect(repoMocks.updateSessionAggregates).toHaveBeenNthCalledWith(1, {
        restaurantId: 1,
        sessionId: 10,
        totalOrdersDelta: 1,
        totalAmountDelta: "10.00",
      });
      expect(repoMocks.updateSessionAggregates).toHaveBeenNthCalledWith(2, {
        restaurantId: 1,
        sessionId: 11,
        totalOrdersDelta: 1,
        totalAmountDelta: "25.00",
      });
    });

    it("rejects invalid sessionId", async () => {
      await expect(
        incrementSessionAggregatesForOrder({
          restaurantId: 1,
          sessionId: 0,
          orderTotalAmount: "10.00",
        })
      ).rejects.toBeInstanceOf(DiningSessionValidationError);

      expect(repoMocks.updateSessionAggregates).not.toHaveBeenCalled();
    });

    it("rejects invalid orderTotalAmount", async () => {
      await expect(
        incrementSessionAggregatesForOrder({
          restaurantId: 1,
          sessionId: 10,
          orderTotalAmount: "not-a-number",
        })
      ).rejects.toBeInstanceOf(DiningSessionValidationError);

      expect(repoMocks.updateSessionAggregates).not.toHaveBeenCalled();
    });

    it("propagates repository update failures", async () => {
      repoMocks.updateSessionAggregates.mockRejectedValue(new Error("db unavailable"));

      await expect(
        incrementSessionAggregatesForOrder({
          restaurantId: 1,
          sessionId: 10,
          orderTotalAmount: "10.00",
        })
      ).rejects.toThrow("db unavailable");
    });
  });

  describe("logSessionAggregateDriftIfAny", () => {
    it("does not log when maintained matches computed", async () => {
      await logSessionAggregateDriftIfAny({ restaurantId: 1, sessionId: 10 });

      expect(opsMocks.opsLog).not.toHaveBeenCalled();
    });

    it("logs session_aggregate_drift_detected on mismatch", async () => {
      repoMocks.findSessionById.mockResolvedValue({
        id: 10,
        restaurantId: 1,
        totalOrders: 2,
        totalAmount: "50.00",
      });

      await logSessionAggregateDriftIfAny({
        restaurantId: 1,
        sessionId: 10,
        procedure: "order.create",
      });

      expect(opsMocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.session_aggregate_drift_detected,
          category: "ORDER",
          severity: "warn",
          restaurantId: 1,
          procedure: "order.create",
          metadata: {
            sessionId: 10,
            maintainedOrders: 2,
            computedOrders: 1,
            maintainedAmount: "50.00",
            computedAmount: "20.00",
          },
        })
      );
    });

    it("excludes cancelled orders from computed count", async () => {
      repoMocks.findSessionById.mockResolvedValue({
        id: 10,
        restaurantId: 1,
        totalOrders: 1,
        totalAmount: "20.00",
      });
      dbMocks.getOrdersBySessionId.mockResolvedValue([
        { id: 55, orderNumber: "ORD-1", status: "pending", totalAmount: "20.00", createdAt: "x" },
        { id: 56, orderNumber: "ORD-2", status: "cancelled", totalAmount: "99.00", createdAt: "y" },
      ]);

      await logSessionAggregateDriftIfAny({ restaurantId: 1, sessionId: 10 });

      expect(opsMocks.opsLog).not.toHaveBeenCalled();
    });
  });
});
