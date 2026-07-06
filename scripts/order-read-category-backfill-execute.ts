/**
 * ORDER-READ-BACKFILL-1 — execute category projection backfill.
 *
 * Usage:
 *   DATABASE_URL='...' ORDER_READ_CATEGORY_BACKFILL_CONFIRM=YES npx tsx scripts/order-read-category-backfill-execute.ts --scope tenant --restaurant-id 123
 *   DATABASE_URL='...' ORDER_READ_CATEGORY_BACKFILL_CONFIRM=YES npx tsx scripts/order-read-category-backfill-execute.ts --scope full
 *   DATABASE_URL='...' ORDER_READ_CATEGORY_BACKFILL_CONFIRM=YES npx tsx scripts/order-read-category-backfill-execute.ts --scope tenant --restaurant-id 123 --verify-only
 */
import "dotenv/config";
import {
  orderReadCategoryBackfillService,
  orderReadCategoryBackfillVerifier,
} from "../server/order/read/readPersistenceComposition";
import type { CategoryBackfillScope } from "../server/order/read/infrastructure/backfill/OrderReadCategoryBackfillService";

function parseFlag(argv: string[], flag: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length && !argv[idx + 1].startsWith("--")) {
    return argv[idx + 1];
  }
  return undefined;
}

function parseArgs(argv: string[]) {
  const scope = parseFlag(argv, "--scope") as CategoryBackfillScope | undefined;
  const restaurantIdRaw = parseFlag(argv, "--restaurant-id");
  const batchSizeRaw = parseFlag(argv, "--batch-size");
  const verifyOnly = argv.includes("--verify-only");

  if (!scope || !["full", "tenant"].includes(scope)) {
    throw new Error("--scope full|tenant is required");
  }

  const restaurantId = restaurantIdRaw ? Number(restaurantIdRaw) : undefined;
  if (scope === "tenant" && !Number.isFinite(restaurantId)) {
    throw new Error("--restaurant-id is required for tenant scope");
  }

  const batchSize = batchSizeRaw ? Number(batchSizeRaw) : undefined;
  if (batchSizeRaw && (!Number.isFinite(batchSize) || batchSize! <= 0)) {
    throw new Error("--batch-size must be a positive integer");
  }

  return { scope, restaurantId, batchSize, verifyOnly };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[order-read-category-backfill] DATABASE_URL is required");
    process.exit(1);
  }
  if (process.env.ORDER_READ_CATEGORY_BACKFILL_CONFIRM !== "YES") {
    console.error(
      "[order-read-category-backfill] Refusing to execute without ORDER_READ_CATEGORY_BACKFILL_CONFIRM=YES"
    );
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const restaurantId = args.scope === "tenant" ? args.restaurantId : undefined;

  if (args.verifyOnly) {
    const verification = await orderReadCategoryBackfillVerifier.verify(restaurantId);
    console.log("[order-read-category-backfill] verification", JSON.stringify(verification, null, 2));
    if (!verification.ok) process.exit(2);
    return;
  }

  console.log("[order-read-category-backfill] starting", args);

  const report = await orderReadCategoryBackfillService.run({
    scope: args.scope,
    restaurantId: args.restaurantId,
    batchSize: args.batchSize,
  });

  console.log("[order-read-category-backfill] report", JSON.stringify(report, null, 2));

  if (report.integrityStatus !== "valid") {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("[order-read-category-backfill] failed", error);
  process.exit(1);
});
