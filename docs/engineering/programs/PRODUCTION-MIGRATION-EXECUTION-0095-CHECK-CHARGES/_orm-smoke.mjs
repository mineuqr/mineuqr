/**
 * PRODUCTION-MIGRATION-EXECUTION-0095-CHECK-CHARGES
 * Application Charge repository smoke. Isolated checkId — not a real Bill.
 * No Payment / Refund / Settlement operations.
 */
import "dotenv/config";
import {
  insertCheckCharge,
  listCheckCharges,
} from "../../../../server/operational-session/check/checkChargeRepository.ts";
import { createAuditConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

const SMOKE_CHECK_ID = 2147483000;
const SMOKE_CHARGE_ID = "chg_smoke_0095_isolated";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");

const conn = await createAuditConnection(url);
try {
  const [restaurants] = await conn.query(
    "SELECT id FROM restaurants ORDER BY id ASC LIMIT 2"
  );
  assert(restaurants.length >= 1, "need at least one restaurant");
  const restaurantId = restaurants[0].id;
  const otherRestaurantId = restaurants[1]?.id ?? restaurantId + 999999;

  const [realCheck] = await conn.query(
    `SELECT id FROM operational_checks
     WHERE restaurantId = ? AND id <> ?
     ORDER BY id ASC LIMIT 1`,
    [restaurantId, SMOKE_CHECK_ID]
  );
  const realCheckId = realCheck[0]?.id ?? null;

  const [collision] = await conn.query(
    "SELECT id FROM operational_checks WHERE id = ? LIMIT 1",
    [SMOKE_CHECK_ID]
  );
  assert(collision.length === 0, "smoke checkId collided with a real Check");

  await insertCheckCharge({
    chargeId: SMOKE_CHARGE_ID,
    restaurantId,
    checkId: SMOKE_CHECK_ID,
    sequence: 1,
    description: "0095 isolated schema smoke",
    quantity: 1,
    unitPrice: "1.00",
    lineDiscount: "0.00",
    modifierAmount: "0.00",
    netAmount: "1.00",
    taxCategory: null,
    taxAmount: "0.00",
    currencyCode: "SAR",
    originOrderId: null,
    originOrderItemId: null,
    originChannel: "smoke",
    originReference: "production-migration-0095",
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  });

  const owned = await listCheckCharges({
    restaurantId,
    checkId: SMOKE_CHECK_ID,
  });
  assert(owned.length === 1, "owned Charge read failed");
  assert(owned[0].chargeId === SMOKE_CHARGE_ID, "chargeId mismatch");
  assert(owned[0].restaurantId === restaurantId, "tenant mismatch");
  assert(owned[0].originOrderId === null, "origin must remain correlation-only");

  const crossTenant = await listCheckCharges({
    restaurantId: otherRestaurantId,
    checkId: SMOKE_CHECK_ID,
  });
  assert(crossTenant.length === 0, "cross-tenant Charge read leaked");

  let realCheckCharges = null;
  if (realCheckId != null) {
    realCheckCharges = await listCheckCharges({
      restaurantId,
      checkId: realCheckId,
    });
    assert(
      realCheckCharges.every((c) => c.chargeId !== SMOKE_CHARGE_ID),
      "smoke Charge attached to a real Check"
    );
  }

  await conn.query("DELETE FROM check_charges WHERE chargeId = ?", [
    SMOKE_CHARGE_ID,
  ]);
  const [left] = await conn.query(
    "SELECT COUNT(*) AS n FROM check_charges WHERE chargeId = ?",
    [SMOKE_CHARGE_ID]
  );
  assert(Number(left[0].n) === 0, "smoke Charge cleanup failed");

  const [total] = await conn.query("SELECT COUNT(*) AS n FROM check_charges");
  assert(Number(total[0].n) === 0, "check_charges is not empty after smoke cleanup");

  console.log(
    JSON.stringify(
      {
        APP_CHARGE_SMOKE: "OK",
        restaurantId,
        isolatedCheckId: SMOKE_CHECK_ID,
        realCheckId,
        realCheckChargeCount: realCheckCharges?.length ?? null,
        tenantIsolation: true,
        leftoverSmokeRows: 0,
      },
      null,
      2
    )
  );
} finally {
  await conn.end();
  process.exit(0);
}
