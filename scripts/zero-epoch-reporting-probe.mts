/** ZERO-EPOCH-SMOKE-CLEANUP-1 — Reporting DTO zero probe */
import "dotenv/config";
import { getBusinessMetricsSummary } from "../server/reporting-platform/BusinessMetricsService";
import { getPaymentMethodAnalytics } from "../server/reporting-platform/PaymentMethodAnalyticsService";

async function main() {
  const restaurantId = Number(process.env.SMOKE_RESTAURANT_ID ?? 720007);
  const business = await getBusinessMetricsSummary({ restaurantId });
  const payments = await getPaymentMethodAnalytics({ restaurantId });
  const ok =
    business.revenue === "0.00" &&
    business.paidCheckCount === 0 &&
    business.averageCheck === "0.00" &&
    business.taxCollected === "0.00" &&
    business.complimentaryCount === 0 &&
    business.voidedCount === 0 &&
    payments.monetaryTenderTotal === "0.00" &&
    payments.buckets.length === 0;

  console.log(
    JSON.stringify(
      {
        restaurantId,
        business: {
          revenue: business.revenue,
          paidCheckCount: business.paidCheckCount,
          averageCheck: business.averageCheck,
          taxCollected: business.taxCollected,
          complimentaryCount: business.complimentaryCount,
          complimentaryAmount: business.complimentaryAmount,
          voidedCount: business.voidedCount,
        },
        payments: {
          monetaryTenderTotal: payments.monetaryTenderTotal,
          complimentaryAmount: payments.complimentaryAmount,
          bucketCount: payments.buckets.length,
        },
        reportingZero: ok,
      },
      null,
      2
    )
  );
  process.exit(ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
