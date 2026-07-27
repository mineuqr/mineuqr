/**
 * PRODUCTION-MIGRATION-EXECUTION-0083 — post-migrate smoke (read-only).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const hash = createHash("sha256")
    .update(
      readFileSync(
        new URL(
          "../../../../drizzle/0083_order_ordering_channel.sql",
          import.meta.url
        )
      )
    )
    .digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [hit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash]
    );
    if (!hit[0]) throw new Error("0083 hash not registered");
    if (hit.length !== 1) throw new Error("0083 hash registered more than once");

    const [cols] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND COLUMN_NAME = 'ordering_channel'
         AND TABLE_NAME IN ('orders', 'order_read_orders')
       ORDER BY TABLE_NAME`
    );
    if (cols.length !== 2) throw new Error("expected ordering_channel on both tables");
    for (const c of cols) {
      if (!String(c.COLUMN_TYPE).includes("varchar(32)")) {
        throw new Error(`bad type ${c.TABLE_NAME}: ${c.COLUMN_TYPE}`);
      }
      if (c.IS_NULLABLE !== "YES") {
        throw new Error(`expected NULLABLE on ${c.TABLE_NAME}`);
      }
    }

    const [pos] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('orders', 'order_read_orders')
         AND COLUMN_NAME IN ('identityScope', 'ordering_channel')
       ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );
    for (const table of ["orders", "order_read_orders"]) {
      const scope = pos.find(
        (r) => r.TABLE_NAME === table && r.COLUMN_NAME === "identityScope"
      );
      const ch = pos.find(
        (r) => r.TABLE_NAME === table && r.COLUMN_NAME === "ordering_channel"
      );
      if (!scope || !ch) throw new Error(`missing neighbor columns on ${table}`);
      if (Number(ch.ORDINAL_POSITION) !== Number(scope.ORDINAL_POSITION) + 1) {
        throw new Error(
          `ordering_channel not immediately after identityScope on ${table}`
        );
      }
    }

    // Architecture: reporting resolution must not use identityScope inference
    const resolveSrc = readFileSync(
      new URL(
        "../../../../shared/ordering-platform/orderingChannelRegistry.ts",
        import.meta.url
      ),
      "utf8"
    );
    if (!resolveSrc.includes("void input.identityScope")) {
      throw new Error("resolveReportingSalesChannel must ignore identityScope");
    }
    if (/scope === ["']TABLE["']/.test(resolveSrc)) {
      throw new Error("legacy TABLE scope fallback must not exist");
    }

    console.log(
      JSON.stringify(
        {
          APP_DB_SMOKE: "OK",
          hash0083RegisteredOnce: true,
          migrationId: hit[0].id,
          created_at: hit[0].created_at,
          columns: cols,
          neighborPositions: pos,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("SMOKE_FAIL", e.message);
  process.exit(1);
});
