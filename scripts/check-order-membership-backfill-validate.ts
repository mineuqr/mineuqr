/**
 * CHECK-GENERALIZATION-M2 — read-only membership vs Session discovery validation.
 *
 * Does NOT write. Does NOT cut over. Does NOT repair mismatches.
 *
 * Usage:
 *   npx tsx scripts/check-order-membership-backfill-validate.ts
 *   npx tsx scripts/check-order-membership-backfill-validate.ts --restaurant-id 123
 */
import "dotenv/config";
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";

type Mismatch = {
  kind: string;
  restaurantId: number;
  checkId?: number;
  sessionId?: number;
  orderId?: number;
  detail: string;
};

function parseFlag(argv: string[], flag: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length && !argv[idx + 1]!.startsWith("--")) {
    return argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[membership-validate] DATABASE_URL is required");
    process.exit(1);
  }

  const restaurantIdRaw = parseFlag(process.argv.slice(2), "--restaurant-id");
  const restaurantId = restaurantIdRaw ? Number(restaurantIdRaw) : null;

  const conn = await createAuditReadonlyConnection(url);
  const mismatches: Mismatch[] = [];

  try {
    const checkFilter =
      restaurantId != null && Number.isFinite(restaurantId)
        ? "AND c.restaurantId = ?"
        : "";
    const checkParams =
      restaurantId != null && Number.isFinite(restaurantId) ? [restaurantId] : [];

    const ridClause = restaurantId != null ? "AND restaurantId = ?" : "";
    const ridParams =
      restaurantId != null && Number.isFinite(restaurantId) ? [restaurantId] : [];

    const [[eligibleChecks]] = await conn.query(
      `SELECT COUNT(*) AS c FROM operational_checks
       WHERE outcome IN ('open','paid','complimentary') ${ridClause}`,
      ridParams
    );
    const [[voidedChecks]] = await conn.query(
      `SELECT COUNT(*) AS c FROM operational_checks WHERE outcome = 'voided' ${ridClause}`,
      ridParams
    );
    const [[membershipRows]] = await conn.query(
      `SELECT COUNT(*) AS c FROM check_order_membership WHERE 1=1 ${ridClause}`,
      ridParams
    );
    const [[activeMembershipRows]] = await conn.query(
      `SELECT COUNT(*) AS c FROM check_order_membership WHERE active = 1 ${ridClause}`,
      ridParams
    );
    const [[backfillRows]] = await conn.query(
      `SELECT COUNT(*) AS c FROM check_order_membership WHERE enrolledReason = 'backfill' ${ridClause}`,
      ridParams
    );
    const [[dualWriteRows]] = await conn.query(
      `SELECT COUNT(*) AS c FROM check_order_membership WHERE enrolledReason = 'session_attach' ${ridClause}`,
      ridParams
    );
    const stats = {
      eligibleChecks: eligibleChecks.c,
      voidedChecks: voidedChecks.c,
      membershipRows: membershipRows.c,
      activeMembershipRows: activeMembershipRows.c,
      backfillRows: backfillRows.c,
      dualWriteRows: dualWriteRows.c,
    };

    // Orphans: membership → missing check / missing order
    const [orphanCheck] = await conn.query(
      `
      SELECT m.id, m.restaurantId, m.checkId, m.orderId
      FROM check_order_membership m
      LEFT JOIN operational_checks c ON c.id = m.checkId
      WHERE c.id IS NULL
        ${restaurantId != null ? "AND m.restaurantId = ?" : ""}
      LIMIT 200
      `,
      checkParams
    );
    for (const row of orphanCheck) {
      mismatches.push({
        kind: "orphan_check",
        restaurantId: row.restaurantId,
        checkId: row.checkId,
        orderId: row.orderId,
        detail: `membership ${row.id} references missing check`,
      });
    }

    const [orphanOrder] = await conn.query(
      `
      SELECT m.id, m.restaurantId, m.checkId, m.orderId
      FROM check_order_membership m
      LEFT JOIN orders o ON o.id = m.orderId
      WHERE o.id IS NULL
        ${restaurantId != null ? "AND m.restaurantId = ?" : ""}
      LIMIT 200
      `,
      checkParams
    );
    for (const row of orphanOrder) {
      mismatches.push({
        kind: "orphan_order",
        restaurantId: row.restaurantId,
        checkId: row.checkId,
        orderId: row.orderId,
        detail: `membership ${row.id} references missing order`,
      });
    }

    // Duplicate active memberships for same order across non-void checks
    const [dupOrders] = await conn.query(
      `
      SELECT m.restaurantId, m.orderId, COUNT(*) AS cnt, GROUP_CONCAT(m.checkId) AS checkIds
      FROM check_order_membership m
      INNER JOIN operational_checks c ON c.id = m.checkId
      WHERE m.active = 1
        AND c.outcome IN ('open','paid','complimentary')
        ${restaurantId != null ? "AND m.restaurantId = ?" : ""}
      GROUP BY m.restaurantId, m.orderId
      HAVING COUNT(*) > 1
      LIMIT 200
      `,
      checkParams
    );
    for (const row of dupOrders) {
      mismatches.push({
        kind: "duplicate_active_membership",
        restaurantId: row.restaurantId,
        orderId: row.orderId,
        detail: `order on checks [${row.checkIds}] count=${row.cnt}`,
      });
    }

    // Session discovery vs membership for eligible checks
    const [checks] = await conn.query(
      `
      SELECT c.id AS checkId, c.restaurantId, c.sessionId, c.outcome
      FROM operational_checks c
      WHERE c.outcome IN ('open','paid','complimentary')
        ${checkFilter}
      ORDER BY c.restaurantId, c.id
      `,
      checkParams
    );

    let checksCompared = 0;
    let exactMatches = 0;
    const matrix = {
      open: { checks: 0, match: 0 },
      paid: { checks: 0, match: 0 },
      complimentary: { checks: 0, match: 0 },
    };

    for (const check of checks) {
      checksCompared += 1;
      const outcome = check.outcome as keyof typeof matrix;
      if (matrix[outcome]) matrix[outcome].checks += 1;

      const [sessionOrders] = await conn.query(
        `
        SELECT o.id AS orderId
        FROM orders o
        WHERE o.restaurantId = ? AND o.sessionId = ?
        ORDER BY o.id
        `,
        [check.restaurantId, check.sessionId]
      );
      const sessionSet = new Set(sessionOrders.map((r: { orderId: number }) => r.orderId));

      const [membershipOrders] = await conn.query(
        `
        SELECT m.orderId
        FROM check_order_membership m
        WHERE m.restaurantId = ? AND m.checkId = ? AND m.active = 1
        ORDER BY m.orderId
        `,
        [check.restaurantId, check.checkId]
      );
      const membershipSet = new Set(
        membershipOrders.map((r: { orderId: number }) => r.orderId)
      );

      const onlySession = [...sessionSet].filter((id) => !membershipSet.has(id));
      const onlyMembership = [...membershipSet].filter((id) => !sessionSet.has(id));

      if (onlySession.length === 0 && onlyMembership.length === 0) {
        exactMatches += 1;
        if (matrix[outcome]) matrix[outcome].match += 1;
      } else {
        mismatches.push({
          kind: "session_vs_membership",
          restaurantId: check.restaurantId,
          checkId: check.checkId,
          sessionId: check.sessionId,
          detail: `outcome=${check.outcome} onlySession=[${onlySession.join(",")}] onlyMembership=[${onlyMembership.join(",")}]`,
        });
      }
    }

    // Voided: expect no active membership (soft-deactivated or never enrolled)
    const [voidedActive] = await conn.query(
      `
      SELECT m.id, m.restaurantId, m.checkId, m.orderId
      FROM check_order_membership m
      INNER JOIN operational_checks c ON c.id = m.checkId
      WHERE c.outcome = 'voided' AND m.active = 1
        ${restaurantId != null ? "AND m.restaurantId = ?" : ""}
      LIMIT 200
      `,
      checkParams
    );
    for (const row of voidedActive) {
      mismatches.push({
        kind: "voided_active_membership",
        restaurantId: row.restaurantId,
        checkId: row.checkId,
        orderId: row.orderId,
        detail: `voided check has active membership ${row.id}`,
      });
    }

    // Outcome / tender matrix samples (counts only — no repair)
    const [outcomeBreakdown] = await conn.query(
      `
      SELECT c.outcome, COUNT(*) AS checks,
        SUM((SELECT COUNT(*) FROM orders o WHERE o.restaurantId = c.restaurantId AND o.sessionId = c.sessionId)) AS sessionOrders,
        SUM((SELECT COUNT(*) FROM check_order_membership m WHERE m.checkId = c.id AND m.active = 1)) AS activeMemberships
      FROM operational_checks c
      WHERE c.outcome IN ('open','paid','complimentary','voided')
        ${checkFilter}
      GROUP BY c.outcome
      `,
      checkParams
    );

    const [settlementChecks] = await conn.query(
      `
      SELECT COUNT(DISTINCT c.id) AS checksWithSettlements
      FROM operational_checks c
      INNER JOIN check_settlement_transactions t ON t.checkId = c.id
      WHERE c.outcome IN ('paid','complimentary')
        ${checkFilter}
      `,
      checkParams
    );

    const [multiOrder] = await conn.query(
      `
      SELECT COUNT(*) AS multiOrderChecks FROM (
        SELECT c.id
        FROM operational_checks c
        INNER JOIN orders o ON o.restaurantId = c.restaurantId AND o.sessionId = c.sessionId
        WHERE c.outcome IN ('open','paid','complimentary')
          ${checkFilter}
        GROUP BY c.id
        HAVING COUNT(o.id) > 1
      ) x
      `,
      checkParams
    );

    const report = {
      scope: restaurantId != null ? { restaurantId } : { scope: "full" },
      stats,
      checksCompared,
      exactMatches,
      mismatchCount: mismatches.length,
      matrix,
      outcomeBreakdown,
      checksWithSettlements: settlementChecks[0]?.checksWithSettlements ?? 0,
      multiOrderChecks: multiOrder[0]?.multiOrderChecks ?? 0,
      mismatches: mismatches.slice(0, 100),
      mismatchesTruncated: mismatches.length > 100,
      verdict:
        mismatches.length === 0 && exactMatches === checksCompared
          ? "PASS"
          : "FAIL",
    };

    console.log(JSON.stringify(report, null, 2));
    if (report.verdict !== "PASS") process.exitCode = 2;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error("[membership-validate] failed", error);
  process.exit(1);
});
