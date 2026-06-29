/**
 * ORDERS-READ-MODEL-1 Phase 3A — execute projection backfill (staging only).
 *
 * Usage:
 *   DATABASE_URL='...' npx tsx scripts/order-read-backfill-execute.ts --scope tenant --restaurant-id 123
 *   DATABASE_URL='...' npx tsx scripts/order-read-backfill-execute.ts --scope partial --restaurant-id 123 --from 2026-06-01 --to 2026-06-30
 *   DATABASE_URL='...' npx tsx scripts/order-read-backfill-execute.ts --scope full
 */
import { orderReadProjectionBackfillService } from "../server/order/read/readPersistenceComposition";
import type { BackfillScope } from "../server/order/read/infrastructure/backfill/OrderReadProjectionBackfillService";

function parseArgs(argv: string[]) {
  const scope = (argv.find((a) => a.startsWith("--scope="))?.split("=")[1] ??
    argv[argv.indexOf("--scope") + 1]) as BackfillScope | undefined;

  const restaurantIdRaw =
    argv.find((a) => a.startsWith("--restaurant-id="))?.split("=")[1] ??
    argv[argv.indexOf("--restaurant-id") + 1];
  const fromDayKey =
    argv.find((a) => a.startsWith("--from="))?.split("=")[1] ??
    argv[argv.indexOf("--from") + 1];
  const toDayKey =
    argv.find((a) => a.startsWith("--to="))?.split("=")[1] ??
    argv[argv.indexOf("--to") + 1];

  if (!scope || !["full", "tenant", "partial"].includes(scope)) {
    throw new Error("--scope full|tenant|partial is required");
  }

  const restaurantId = restaurantIdRaw ? Number(restaurantIdRaw) : undefined;
  if ((scope === "tenant" || scope === "partial") && !Number.isFinite(restaurantId)) {
    throw new Error("--restaurant-id is required for tenant/partial scope");
  }
  if (scope === "partial" && (!fromDayKey || !toDayKey)) {
    throw new Error("--from and --to day keys (YYYY-MM-DD) required for partial scope");
  }

  return { scope, restaurantId, fromDayKey, toDayKey };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[order-read-backfill] DATABASE_URL is required");
    process.exit(1);
  }
  if (process.env.ORDER_READ_BACKFILL_CONFIRM !== "YES") {
    console.error(
      "[order-read-backfill] Refusing to execute without ORDER_READ_BACKFILL_CONFIRM=YES"
    );
    process.exit(1);
  }
  if (process.env.ORDER_READ_PROJECTIONS_ENABLED === "true") {
    console.error(
      "[order-read-backfill] ORDER_READ_PROJECTIONS_ENABLED must remain false in Phase 3A"
    );
    process.exit(1);
  }

  const request = parseArgs(process.argv.slice(2));
  console.log("[order-read-backfill] starting", request);

  const run = await orderReadProjectionBackfillService.run({
    scope: request.scope,
    restaurantId: request.restaurantId,
    fromDayKey: request.fromDayKey,
    toDayKey: request.toDayKey,
  });

  console.log("[order-read-backfill] completed", JSON.stringify(run, null, 2));
}

main().catch((error) => {
  console.error("[order-read-backfill] failed", error);
  process.exit(1);
});
