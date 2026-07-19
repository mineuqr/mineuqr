/**
 * CHECK-GENERALIZATION-M1 — confirm-gated membership backfill CLI.
 *
 * PREPARE ONLY in M1 program: do not run against production unless
 * Architecture Authority explicitly schedules a backfill window.
 *
 * Usage (dry-run):
 *   npx tsx scripts/check-order-membership-backfill-execute.ts --scope full --dry-run
 *
 * Usage (execute — requires confirm):
 *   CHECK_MEMBERSHIP_BACKFILL_CONFIRM=YES \
 *     npx tsx scripts/check-order-membership-backfill-execute.ts --scope tenant --restaurant-id 123
 */
import "dotenv/config";
import {
  backfillCheckOrderMembership,
  dryRunCheckOrderMembershipBackfill,
  type MembershipBackfillScope,
} from "../server/operational-session/check/CheckMembershipBackfillService";

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
  const scope = parseFlag(argv, "--scope") as MembershipBackfillScope | undefined;
  const restaurantIdRaw = parseFlag(argv, "--restaurant-id");
  const dryRun = argv.includes("--dry-run");

  if (!scope || !["full", "tenant"].includes(scope)) {
    throw new Error("--scope full|tenant is required");
  }

  const restaurantId = restaurantIdRaw ? Number(restaurantIdRaw) : undefined;
  if (scope === "tenant" && !Number.isFinite(restaurantId)) {
    throw new Error("--restaurant-id is required for tenant scope");
  }

  return { scope, restaurantId, dryRun };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[check-membership-backfill] DATABASE_URL is required");
    process.exit(1);
  }

  const request = parseArgs(process.argv.slice(2));
  console.log("[check-membership-backfill] starting", request);

  if (request.dryRun) {
    const dry = await dryRunCheckOrderMembershipBackfill({
      scope: request.scope,
      restaurantId: request.restaurantId,
    });
    console.log("[check-membership-backfill] dry-run", dry);
    return;
  }

  if (process.env.CHECK_MEMBERSHIP_BACKFILL_CONFIRM !== "YES") {
    console.error(
      "[check-membership-backfill] Refusing execute without CHECK_MEMBERSHIP_BACKFILL_CONFIRM=YES (use --dry-run)"
    );
    process.exit(1);
  }

  const result = await backfillCheckOrderMembership({
    scope: request.scope,
    restaurantId: request.restaurantId,
  });
  console.log("[check-membership-backfill] completed", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[check-membership-backfill] failed", error);
  process.exit(1);
});
