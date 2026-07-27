/**
 * ORDERING-CHANNEL-GOVERNANCE-1 — stamp → Sales Channel Analytics integration.
 */
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform";
import { buildSalesChannelAnalyticsFromOrderLines } from "../SalesChannelAnalyticsService";

describe("ORDERING-CHANNEL-GOVERNANCE-1 channel → analytics integration", () => {
  const period = {
    restaurantId: 1,
    from: "2026-07-01 00:00:00",
    to: "2026-07-31 23:59:59",
  };

  it.each([
    {
      name: "Table Session",
      stamp: ORDERING_CHANNEL_TABLE_SESSION,
      reportingId: "table",
    },
    {
      name: "QR Ordering",
      stamp: ORDERING_CHANNEL_QR,
      reportingId: "qr",
    },
    {
      name: "Waiter Tablet",
      stamp: ORDERING_CHANNEL_WAITER_TABLET,
      reportingId: "waiter",
    },
    {
      name: "Self Ordering Kiosk",
      stamp: ORDERING_CHANNEL_KIOSK,
      reportingId: "kiosk",
    },
  ] as const)(
    "$name: stamp → Sales Channel Analytics bucket",
    ({ stamp, reportingId }) => {
      const dto = buildSalesChannelAnalyticsFromOrderLines(period, [
        { orderingChannel: stamp, totalAmount: "40.00" },
        { orderingChannel: stamp, totalAmount: "60.00" },
      ]);
      expect(dto.totalSalesAmount).toBe("100.00");
      expect(dto.totalOrderCount).toBe(2);
      const bucket = dto.buckets.find((b) => b.channelId === reportingId)!;
      expect(bucket.salesAmount).toBe("100.00");
      expect(bucket.orderCount).toBe(2);
      expect(bucket.salesMixPercent).toBe("100.00");
      expect(bucket.orderMixPercent).toBe("100.00");
      for (const id of ["table", "waiter", "qr", "kiosk"] as const) {
        if (id === reportingId) continue;
        expect(dto.buckets.find((b) => b.channelId === id)?.orderCount ?? 0).toBe(
          0
        );
      }
    }
  );

  it("mixed channels: percentages and no double counting", () => {
    const dto = buildSalesChannelAnalyticsFromOrderLines(period, [
      { orderingChannel: ORDERING_CHANNEL_TABLE_SESSION, totalAmount: "25.00" },
      { orderingChannel: ORDERING_CHANNEL_QR, totalAmount: "25.00" },
      { orderingChannel: ORDERING_CHANNEL_WAITER_TABLET, totalAmount: "25.00" },
      { orderingChannel: ORDERING_CHANNEL_KIOSK, totalAmount: "25.00" },
    ]);
    expect(dto.totalSalesAmount).toBe("100.00");
    expect(dto.totalOrderCount).toBe(4);
    for (const id of ["table", "qr", "waiter", "kiosk"] as const) {
      const b = dto.buckets.find((x) => x.channelId === id)!;
      expect(b.salesAmount).toBe("25.00");
      expect(b.salesMixPercent).toBe("25.00");
      expect(b.orderMixPercent).toBe("25.00");
    }
  });
});
