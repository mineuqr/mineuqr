/**
 * Read Charge composition for a real Production Check. No writes.
 */
import "dotenv/config";
import { listCheckCharges } from "../../../../server/operational-session/check/checkChargeRepository.ts";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const conn = await createAuditReadonlyConnection(url);
try {
  const [rows] = await conn.query(
    `SELECT id, restaurantId, outcome, grandTotal
     FROM operational_checks
     ORDER BY id ASC
     LIMIT 1`
  );
  if (rows.length === 0) throw new Error("no operational_checks");
  const check = rows[0];
  const charges = await listCheckCharges({
    restaurantId: check.restaurantId,
    checkId: check.id,
  });
  console.log(
    JSON.stringify(
      {
        CHECK_CHARGE_READ_SMOKE: "OK",
        checkId: check.id,
        restaurantId: check.restaurantId,
        outcome: check.outcome,
        grandTotal: String(check.grandTotal),
        chargeCount: charges.length,
      },
      null,
      2
    )
  );
} finally {
  await conn.end();
  process.exit(0);
}
