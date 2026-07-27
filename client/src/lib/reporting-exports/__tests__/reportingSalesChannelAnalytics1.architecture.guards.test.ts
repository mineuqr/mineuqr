/**
 * REPORTING-SALES-CHANNEL-ANALYTICS-1 — architecture + presentation guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPORTING_CONTRACT_VERSION } from "@shared/reporting-platform";
import type { SalesChannelAnalyticsDto } from "@shared/reporting-platform";
import {
  buildSalesSourceAnalysisVmFromDto,
  mapSalesChannelAnalyticsToFacts,
} from "../salesSourceAnalysisPresentation";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sampleDto(
  overrides: Partial<SalesChannelAnalyticsDto> = {}
): SalesChannelAnalyticsDto {
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "SalesChannelAnalytics",
    programId: "REPORTING-SALES-CHANNEL-ANALYTICS-1",
    generatedAt: "2026-07-27T00:00:00.000Z",
    restaurantId: 1,
    from: "2026-07-01 00:00:00",
    to: "2026-07-31 23:59:59",
    totalSalesAmount: "200.00",
    totalOrderCount: 2,
    buckets: [
      {
        channelId: "table",
        channelName: "Table Sessions",
        orderCount: 0,
        salesAmount: "0.00",
        salesMixPercent: "0.00",
        orderMixPercent: "0.00",
      },
      {
        channelId: "waiter",
        channelName: "Waiter Orders",
        orderCount: 1,
        salesAmount: "80.00",
        salesMixPercent: "40.00",
        orderMixPercent: "50.00",
      },
      {
        channelId: "qr",
        channelName: "QR Ordering",
        orderCount: 1,
        salesAmount: "120.00",
        salesMixPercent: "60.00",
        orderMixPercent: "50.00",
      },
      {
        channelId: "kiosk",
        channelName: "Self Ordering Kiosk",
        orderCount: 0,
        salesAmount: "0.00",
        salesMixPercent: "0.00",
        orderMixPercent: "0.00",
      },
    ],
    ...overrides,
  };
}

describe("REPORTING-SALES-CHANNEL-ANALYTICS-1 architecture", () => {
  it("exposes reporting.getSalesChannelAnalytics on router + façade", () => {
    const router = read("server/reporting-platform/reportingRouter.ts");
    expect(router).toContain("getSalesChannelAnalytics");
    const facade = read("server/reporting-platform/ReportingService.ts");
    expect(facade).toContain("getSalesChannelAnalytics");
    const index = read("server/reporting-platform/index.ts");
    expect(index).toContain("getSalesChannelAnalytics");
  });

  it("stamps OrderingChannelId on place APIs", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("ORDERING_CHANNEL_QR");
    expect(routers).toContain("ORDERING_CHANNEL_WAITER_TABLET");
    expect(routers).toContain("orderingChannel:");
    const checkout = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    expect(checkout).toContain("orderingChannel: runtime.channel");
  });

  it("does not redefine revenue / payment analytics ownership", () => {
    const service = read(
      "server/reporting-platform/SalesChannelAnalyticsService.ts"
    );
    expect(service).toContain("Order Sales");
    expect(service).not.toContain("getBusinessMetricsSummary");
    expect(service).not.toContain("getPaymentMethodAnalytics");
    expect(service).toContain("listServedOrdersForChannelReporting");
  });

  it("presentation maps DTO only — no UI mix arithmetic", () => {
    const src = read(
      "client/src/lib/reporting-exports/salesSourceAnalysisPresentation.ts"
    );
    expect(src).not.toMatch(/\*\s*100|\/\s*totalSales|salesMix\s*=/);
    const dto = sampleDto();
    const facts = mapSalesChannelAnalyticsToFacts(dto, "en");
    const qr = facts.find((f) => f.channelId === "qr")!;
    expect(qr.amountDisplay).toBe("120.00");
    expect(qr.salesMixDisplay).toBe("60.00%");
    const vm = buildSalesSourceAnalysisVmFromDto({
      language: "en",
      analytics: dto,
    });
    expect(vm.projectionUnavailable).toBe(false);
    expect(vm.hasAnyFact).toBe(true);
    expect(vm.totalSalesAmount).toBe("200.00");
  });

  it("migration + schema publish ordering_channel", () => {
    const migration = read("drizzle/0083_order_ordering_channel.sql");
    expect(migration).toContain("ordering_channel");
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('varchar("ordering_channel"');
  });
});
