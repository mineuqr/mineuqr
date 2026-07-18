/**
 * REPORTING-BUSINESS-DAY-BACKFILL-1 — rebuild Order Read daily rollups with
 * canonical Business Day dayKeys (P-06 / P-10 only).
 *
 * Usage:
 *   DATABASE_URL='...' ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
 *     npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts --scope full
 *
 *   DATABASE_URL='...' ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
 *     npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts --scope tenant --restaurant-id 123
 */
import "dotenv/config";
import { orderReadBusinessDayRollupBackfillService } from "../server/order/read/readPersistenceComposition";
import type { BusinessDayRollupBackfillScope } from "../server/order/read/infrastructure/backfill/OrderReadBusinessDayRollupBackfillService";

function parseFlag(argv: string[], flag: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length && !argv[idx + 1]!.startsWith("--")) {
    return argv[idx + 1];
  }
  return undefined;
}

function parseArgs(argv: string[]) {
  const scope = parseFlag(argv, "--scope") as BusinessDayRollupBackfillScope | undefined;
  const restaurantIdRaw = parseFlag(argv, "--restaurant-id");

  if (!scope || !["full", "tenant"].includes(scope)) {
    throw new Error("--scope full|tenant is required");
  }

  const restaurantId = restaurantIdRaw ? Number(restaurantIdRaw) : undefined;
  if (scope === "tenant" && !Number.isFinite(restaurantId)) {
    throw new Error("--restaurant-id is required for tenant scope");
  }

  return { scope, restaurantId };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[bd-rollup-backfill] DATABASE_URL is required");
    process.exit(1);
  }
  if (process.env.ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM !== "YES") {
    console.error(
      "[bd-rollup-backfill] Refusing to execute without ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES"
    );
    process.exit(1);
  }

  const request = parseArgs(process.argv.slice(2));
  console.log("[bd-rollup-backfill] starting", request);

  const run = await orderReadBusinessDayRollupBackfillService.run({
    scope: request.scope,
    restaurantId: request.restaurantId,
  });

  console.log("[bd-rollup-backfill] completed", JSON.stringify(run, null, 2));
}

main().catch((error) => {
  console.error("[bd-rollup-backfill] failed", error);
  process.exit(1);
});
