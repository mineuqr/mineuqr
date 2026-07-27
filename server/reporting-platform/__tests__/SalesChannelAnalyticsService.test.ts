/**
 * REPORTING-SALES-CHANNEL-ANALYTICS-1 / ORDERING-CHANNEL-GOVERNANCE-1
 * Order Sales by channel — OrderingChannelId stamp only (no identityScope inference).
 */
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
  REPORTING_SALES_CHANNEL_UNASSIGNED,
} from "@shared/ordering-platform";
import { buildSalesChannelAnalyticsFromOrderLines } from "../SalesChannelAnalyticsService";

describe("buildSalesChannelAnalyticsFromOrderLines", () => {
  const period = {
    restaurantId: 7,
    from: "2026-07-01 00:00:00",
    to: "2026-07-31 23:59:59",
  };

  it("aggregates Table Session, Waiter, QR, Kiosk without double counting", () => {
    const dto = buildSalesChannelAnalyticsFromOrderLines(period, [
      {
        orderingChannel: ORDERING_CHANNEL_TABLE_SESSION,
        totalAmount: "100.00",
      },
      {
        orderingChannel: ORDERING_CHANNEL_WAITER_TABLET,
        totalAmount: "50.00",
      },
      {
        orderingChannel: ORDERING_CHANNEL_QR,
        totalAmount: "150.00",
      },
      {
        orderingChannel: ORDERING_CHANNEL_KIOSK,
        totalAmount: "100.00",
      },
    ]);

    expect(dto.contractId).toBe("SalesChannelAnalytics");
    expect(dto.totalSalesAmount).toBe("400.00");
    expect(dto.totalOrderCount).toBe(4);

    const byId = Object.fromEntries(dto.buckets.map((b) => [b.channelId, b]));
    expect(byId.table.orderCount).toBe(1);
    expect(byId.table.salesAmount).toBe("100.00");
    expect(byId.table.salesMixPercent).toBe("25.00");

    expect(byId.waiter.salesAmount).toBe("50.00");
    expect(byId.qr.salesAmount).toBe("150.00");
    expect(byId.kiosk.salesAmount).toBe("100.00");

    const salesSum = dto.buckets.reduce(
      (s, b) => s + Number.parseFloat(b.salesAmount),
      0
    );
    expect(salesSum).toBeCloseTo(400, 2);
  });

  it("does not infer channel from identityScope (legacy removed)", () => {
    const dto = buildSalesChannelAnalyticsFromOrderLines(period, [
      {
        orderingChannel: null,
        totalAmount: "80.00",
      },
    ]);
    const unassigned = dto.buckets.find(
      (b) => b.channelId === REPORTING_SALES_CHANNEL_UNASSIGNED
    );
    const table = dto.buckets.find((b) => b.channelId === "table");
    expect(unassigned?.orderCount).toBe(1);
    expect(unassigned?.salesAmount).toBe("80.00");
    expect(table?.orderCount ?? 0).toBe(0);
  });

  it("maps OrderingChannelId stamp only (QR vs table_session)", () => {
    const dto = buildSalesChannelAnalyticsFromOrderLines(period, [
      {
        orderingChannel: ORDERING_CHANNEL_QR,
        totalAmount: "80.00",
      },
    ]);
    expect(dto.buckets.find((b) => b.channelId === "qr")!.orderCount).toBe(1);
    expect(dto.buckets.find((b) => b.channelId === "table")!.orderCount).toBe(0);
  });

  it("passes through unknown future channels without redesign", () => {
    const dto = buildSalesChannelAnalyticsFromOrderLines(period, [
      {
        orderingChannel: "drive_thru",
        totalAmount: "25.00",
      },
    ]);
    const future = dto.buckets.find((b) => b.channelId === "drive_thru");
    expect(future).toBeDefined();
    expect(future!.salesAmount).toBe("25.00");
    expect(future!.salesMixPercent).toBe("100.00");
  });

  it("returns zero totals with catalog buckets when empty", () => {
    const dto = buildSalesChannelAnalyticsFromOrderLines(period, []);
    expect(dto.totalSalesAmount).toBe("0.00");
    expect(dto.totalOrderCount).toBe(0);
    expect(dto.buckets.some((b) => b.channelId === "qr")).toBe(true);
    expect(
      dto.buckets
        .filter((b) => b.channelId !== REPORTING_SALES_CHANNEL_UNASSIGNED)
        .every((b) => b.salesAmount === "0.00")
    ).toBe(true);
  });
});
