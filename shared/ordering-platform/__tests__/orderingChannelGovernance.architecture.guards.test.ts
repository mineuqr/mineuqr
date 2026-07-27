/**
 * ORDERING-CHANNEL-GOVERNANCE-1 — registry + resolution + stamp governance.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_IDS,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_REGISTRY,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
  REPORTING_SALES_CHANNEL_UNASSIGNED,
  assertOrderingChannelId,
  isRegisteredOrderingChannelId,
  mapOrderingChannelToSalesChannel,
  resolveReportingSalesChannel,
} from "../orderingChannelRegistry";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-CHANNEL-GOVERNANCE-1 registry", () => {
  it("registers active channels including Table Session", () => {
    const ids = ORDERING_CHANNEL_REGISTRY.map((e) => e.id);
    expect(ids).toContain(ORDERING_CHANNEL_TABLE_SESSION);
    expect(ids).toContain(ORDERING_CHANNEL_QR);
    expect(ids).toContain(ORDERING_CHANNEL_WAITER_TABLET);
    expect(ids).toContain(ORDERING_CHANNEL_KIOSK);
    expect(ids).toContain("marketplace");
    expect(ids).toContain("delivery_partner");
    expect(ids).toContain("call_center");
    expect(ids).toContain("mobile");
    expect(ORDERING_CHANNEL_IDS).toEqual(ids);
  });

  it("maps OrderingChannelId to reporting vocabulary without identityScope", () => {
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_TABLE_SESSION)).toBe(
      "table"
    );
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_WAITER_TABLET)).toBe(
      "waiter"
    );
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_QR)).toBe("qr");
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_KIOSK)).toBe("kiosk");
    expect(mapOrderingChannelToSalesChannel(null)).toBe(
      REPORTING_SALES_CHANNEL_UNASSIGNED
    );
    expect(
      resolveReportingSalesChannel({
        orderingChannel: null,
        identityScope: "TABLE",
      })
    ).toBe(REPORTING_SALES_CHANNEL_UNASSIGNED);
    expect(
      resolveReportingSalesChannel({
        orderingChannel: ORDERING_CHANNEL_QR,
        identityScope: "TABLE",
      })
    ).toBe("qr");
  });

  it("assertOrderingChannelId rejects missing / unknown stamps", () => {
    expect(assertOrderingChannelId(ORDERING_CHANNEL_TABLE_SESSION)).toBe(
      ORDERING_CHANNEL_TABLE_SESSION
    );
    expect(() => assertOrderingChannelId(null)).toThrow(/OrderingChannelId required/);
    expect(() => assertOrderingChannelId("not_a_channel")).toThrow(
      /OrderingChannelId required/
    );
    expect(isRegisteredOrderingChannelId("drive_thru")).toBe(false);
  });

  it("place paths stamp OrderingChannelId; reporting has no TABLE fallback", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("ORDERING_CHANNEL_QR");
    expect(routers).toContain("ORDERING_CHANNEL_WAITER_TABLET");
    expect(routers).toMatch(/orderingChannel:\s*z\.enum/);

    const waiterDevice = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    expect(waiterDevice).toContain("ORDERING_CHANNEL_WAITER_TABLET");
    expect(waiterDevice).toContain("orderingChannel:");

    const place = read("server/order/application/PlaceOrderService.ts");
    expect(place).toContain("assertOrderingChannelId");
    expect(place).toContain("orderingChannel: string");

    const resolve = read("shared/ordering-platform/orderingChannelRegistry.ts");
    expect(resolve).toContain("void input.identityScope");
    expect(resolve).not.toMatch(/scope === \"TABLE\"/);

    const analytics = read(
      "server/reporting-platform/SalesChannelAnalyticsService.ts"
    );
    expect(analytics).not.toContain("identityScope: row.identityScope");
  });
});
