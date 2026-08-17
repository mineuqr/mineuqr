/**
 * POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1
 * SELECT / INFORMATION_SCHEMA only. Mutation NONE.
 * Uses DATABASE_URL. Refuses G07 / stagIn / same SQL user as G07.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
  parseDatabaseUrl,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";
import { hashMigrationSql } from "../../../../scripts/lib/migration-governance-lib.cjs";

const CERTIFIED_0094 =
  "134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47";
const PRODUCTION_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";

function asPlain(row) {
  const out = {};
  for (const [k, v] of Object.entries(row ?? {})) {
    out[k] =
      typeof v === "bigint"
        ? Number(v)
        : v instanceof Date
          ? v.toISOString()
          : v;
  }
  return out;
}

function userPrefix(user) {
  const at = String(user ?? "").indexOf(".");
  return at === -1 ? String(user ?? "") : String(user).slice(0, at);
}

function classifyIdentity(databaseUrl, g07Url) {
  const cfg = parseDatabaseUrl(databaseUrl);
  const host = (cfg.host ?? "").toLowerCase();
  const g07 = g07Url ? parseDatabaseUrl(g07Url) : null;
  const sameSqlUserAsG07 =
    g07 != null &&
    host === (g07.host ?? "").toLowerCase() &&
    (cfg.user ?? "") === (g07.user ?? "");
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  const isExactProductionHost = host === PRODUCTION_HOST;
  const looksStagInUser = userPrefix(cfg.user) === "3BUSFE99csVhDLu";
  let verdict = "ACCEPT_PRODUCTION";
  if (!isTidbCloud) verdict = "REJECT_NOT_TIDB_CLOUD";
  if (sameSqlUserAsG07 || looksStagInUser) verdict = "REJECT_STAGIN_OR_G07";
  if (cfg.database !== "mineuqr") verdict = "REJECT_WRONG_DATABASE";
  if (!isExactProductionHost) verdict = "REJECT_NOT_CERTIFIED_PRODUCTION_HOST";
  return {
    host,
    port: Number(cfg.port ?? 0),
    database: cfg.database ?? "",
    userPrefix: userPrefix(cfg.user),
    isTidbCloud,
    tls: true,
    isExactProductionHost,
    sameSqlUserAsG07,
    looksStagInUser,
    verdict,
  };
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required");
  const g07 = process.env.G07_DATABASE_URL?.trim() || null;
  const identity = classifyIdentity(url, g07);
  const target = auditConnectionTarget(url);
  if (identity.verdict !== "ACCEPT_PRODUCTION") {
    console.error(JSON.stringify({ mutation: 0, identity, stop: identity.verdict }));
    process.exit(3);
  }

  const hash0094 = hashMigrationSql("0094_commercial_limit_occupancy_locks");
  if (hash0094 !== CERTIFIED_0094) {
    throw new Error("local 0094 SQL hash does not match certified hash");
  }

  const conn = await createAuditReadonlyConnection(url);
  const statements = [];
  const q = async (text, params) => {
    const trimmed = text.trim();
    if (!/^(SELECT|SHOW)/i.test(trimmed)) {
      throw new Error(`REFUSED_NON_SELECT: ${trimmed.slice(0, 80)}`);
    }
    statements.push(trimmed.split(/\s+/)[0].toUpperCase());
    const [rows] = params
      ? await conn.execute(text, params)
      : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };

  try {
    const session = (
      await q(
        `SELECT DATABASE() AS db, CURRENT_USER() AS currentUser,
                @@version AS version, CURRENT_TIMESTAMP() AS server_ts`
      )
    )[0];
    if (session?.db !== "mineuqr") {
      throw new Error(`DATABASE() is ${session?.db}, expected mineuqr`);
    }
    const sessionUserPrefix = userPrefix(
      String(session.currentUser ?? "").split("@")[0]
    );
    if (sessionUserPrefix === "3BUSFE99csVhDLu") {
      throw new Error("session user is G07/stagIn prefix");
    }

    const journal0094 = await q(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0094]
    );
    const latest = await q(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 3"
    );
    const hashDupes = await q(
      "SELECT hash, COUNT(*) AS n FROM `__drizzle_migrations` GROUP BY hash HAVING COUNT(*) > 1"
    );
    const journalCount = await q(
      "SELECT COUNT(*) AS n FROM `__drizzle_migrations`"
    );

    const lockTable = await q(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_limit_occupancy_locks'`
    );
    const lockCols = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_limit_occupancy_locks'
       ORDER BY ORDINAL_POSITION`
    );
    const lockIdx = await q(
      `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_limit_occupancy_locks'
       GROUP BY INDEX_NAME, NON_UNIQUE`
    );
    const occupancyLike = await q(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND (TABLE_NAME LIKE '%occupancy%' OR TABLE_NAME LIKE '%commercial_limit_occupancy%')
       ORDER BY TABLE_NAME`
    );
    const lockRows = await q(
      "SELECT COUNT(*) AS n FROM commercial_limit_occupancy_locks"
    );

    const resourceCounts = (
      await q(
        `SELECT
           (SELECT COUNT(*) FROM restaurants) AS restaurants,
           (SELECT COUNT(*) FROM restaurants WHERE isActive = 0) AS restaurantsInactive,
           (SELECT COUNT(*) FROM categories) AS categories,
           (SELECT COUNT(*) FROM categories WHERE isActive = 0) AS categoriesInactive,
           (SELECT COUNT(*) FROM menu_items) AS items,
           (SELECT COUNT(*) FROM menu_items WHERE isAvailable = 0) AS itemsUnavailable,
           (SELECT COUNT(*) FROM pos_terminals) AS posTerminals,
           (SELECT COUNT(*) FROM pos_terminals WHERE lifecycle IN ('registered','active')) AS posProvisioned,
           (SELECT COUNT(*) FROM pos_terminals WHERE lifecycle = 'deactivated') AS posDeactivated,
           (SELECT COUNT(*) FROM pos_terminals WHERE lifecycle = 'replaced') AS posReplaced`
      )
    )[0];

    const planLimits = await q(
      `SELECT p.id, p.code, p.name, p.isHidden, p.limitProfileId,
              v.limitKey, v.value
       FROM commercial_plans p
       LEFT JOIN commercial_limit_values v ON v.profileId = p.limitProfileId
       ORDER BY p.sortOrder, p.code, v.limitKey`
    );

    const plans = {};
    for (const row of planLimits) {
      if (!plans[row.code]) {
        plans[row.code] = {
          planId: row.id,
          name: row.name,
          isHidden: row.isHidden,
          posTerminals: null,
          restaurants: null,
          categories: null,
          items: null,
        };
      }
      if (row.limitKey) plans[row.code][row.limitKey] = row.value;
    }

    const ownerCaps = `
      SELECT us.userId,
             MAX(CASE WHEN vr.limitKey = 'restaurants' THEN vr.value END) AS restaurantsCap,
             MAX(CASE WHEN vc.limitKey = 'categories' THEN vc.value END) AS categoriesCap,
             MAX(CASE WHEN vi.limitKey = 'items' THEN vi.value END) AS itemsCap,
             MAX(CASE WHEN vp.limitKey = 'posTerminals' THEN vp.value END) AS posTerminalsCap
      FROM user_subscriptions us
      INNER JOIN (
        SELECT userId, MAX(id) AS id
        FROM user_subscriptions
        WHERE restaurantId = 0
        GROUP BY userId
      ) latest ON latest.id = us.id
      LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
      LEFT JOIN commercial_plans p ON p.id = COALESCE(b.planId, us.planId)
      LEFT JOIN commercial_limit_values vr
        ON vr.profileId = p.limitProfileId AND vr.limitKey = 'restaurants'
      LEFT JOIN commercial_limit_values vc
        ON vc.profileId = p.limitProfileId AND vc.limitKey = 'categories'
      LEFT JOIN commercial_limit_values vi
        ON vi.profileId = p.limitProfileId AND vi.limitKey = 'items'
      LEFT JOIN commercial_limit_values vp
        ON vp.profileId = p.limitProfileId AND vp.limitKey = 'posTerminals'
      GROUP BY us.userId
    `;

    const restaurantOccupancy = await q(
      `SELECT o.userId, o.occupancy, c.restaurantsCap AS cap
       FROM (
         SELECT userId, COUNT(*) AS occupancy FROM restaurants GROUP BY userId
       ) o
       LEFT JOIN (${ownerCaps}) c ON c.userId = o.userId
       ORDER BY o.userId`
    );
    const owner1 = restaurantOccupancy.find((row) => Number(row.userId) === 1) ?? null;

    const categoryOccupancy = await q(
      `SELECT o.restaurantId, o.occupancy, c.categoriesCap AS cap
       FROM (
         SELECT restaurantId, COUNT(*) AS occupancy FROM categories GROUP BY restaurantId
       ) o
       INNER JOIN restaurants r ON r.id = o.restaurantId
       LEFT JOIN (${ownerCaps}) c ON c.userId = r.userId
       ORDER BY o.restaurantId`
    );
    const itemOccupancy = await q(
      `SELECT o.restaurantId, o.occupancy, c.itemsCap AS cap
       FROM (
         SELECT restaurantId, COUNT(*) AS occupancy FROM menu_items GROUP BY restaurantId
       ) o
       INNER JOIN restaurants r ON r.id = o.restaurantId
       LEFT JOIN (${ownerCaps}) c ON c.userId = r.userId
       ORDER BY o.restaurantId`
    );
    const posOccupancy = await q(
      `SELECT o.restaurantId, o.occupancy, c.posTerminalsCap AS cap
       FROM (
         SELECT restaurantId,
                SUM(CASE WHEN lifecycle IN ('registered','active') THEN 1 ELSE 0 END) AS occupancy
         FROM pos_terminals
         GROUP BY restaurantId
       ) o
       INNER JOIN restaurants r ON r.id = o.restaurantId
       LEFT JOIN (${ownerCaps}) c ON c.userId = r.userId
       ORDER BY o.restaurantId`
    );

    const commercialCounts = (
      await q(
        `SELECT
           (SELECT COUNT(*) FROM commercial_plans) AS plans,
           (SELECT COUNT(*) FROM commercial_limit_profiles) AS profiles,
           (SELECT COUNT(*) FROM commercial_limit_values) AS limitValues,
           (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
           (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions`
      )
    )[0];

    const overCap = {
      restaurants: restaurantOccupancy.filter(
        (row) => row.cap != null && Number(row.occupancy) > Number(row.cap)
      ),
      categories: categoryOccupancy.filter(
        (row) => row.cap != null && Number(row.occupancy) > Number(row.cap)
      ),
      items: itemOccupancy.filter(
        (row) => row.cap != null && Number(row.occupancy) > Number(row.cap)
      ),
      pos: posOccupancy.filter(
        (row) => row.cap != null && Number(row.occupancy) > Number(row.cap)
      ),
    };

    const evidence = {
      program: "POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1",
      queriedAt: new Date().toISOString(),
      mutation: 0,
      statements: {
        kinds: [...new Set(statements)],
        count: statements.length,
        refusedNonSelect: 0,
      },
      identity,
      target: { hostPattern: "tidbcloud_prod", ...target, user: undefined },
      session: {
        db: session.db,
        version: session.version,
        server_ts: session.server_ts,
        currentUserPrefix: sessionUserPrefix,
      },
      journal: {
        hash0094,
        certified0094: CERTIFIED_0094,
        hash0094MatchesCertified: hash0094 === CERTIFIED_0094,
        count0094: journal0094.length,
        row0094: journal0094[0] ?? null,
        latest: latest[0] ?? null,
        journalEntryCount: Number(journalCount[0]?.n ?? 0),
        duplicateHashes: hashDupes,
      },
      schema: {
        lockTableExists: lockTable.length === 1,
        columns: lockCols.map((c) => c.COLUMN_NAME),
        columnDetails: lockCols,
        indexes: lockIdx,
        lockRowCount: Number(lockRows[0]?.n ?? 0),
        occupancyLikeTables: occupancyLike.map((r) => r.TABLE_NAME),
      },
      commercial: {
        counts: commercialCounts,
        plans: Object.entries(plans).map(([code, row]) => ({ code, ...row })),
        plansMissingPosTerminals: Object.entries(plans)
          .filter(([, row]) => row.posTerminals == null)
          .map(([code]) => code),
      },
      census: {
        resources: resourceCounts,
        perOwnerRestaurants: restaurantOccupancy,
        owner1,
        perRestaurantCategories: categoryOccupancy,
        perRestaurantItems: itemOccupancy,
        perRestaurantPos: posOccupancy,
        overCap: {
          restaurants: overCap.restaurants.length,
          categories: overCap.categories.length,
          items: overCap.items.length,
          posTerminals: overCap.pos.length,
          restaurantOwners: overCap.restaurants,
        },
      },
    };

    const dir = dirname(fileURLToPath(import.meta.url));
    writeFileSync(
      join(dir, "SMOKE-EVIDENCE.json"),
      `${JSON.stringify(evidence, null, 2)}\n`
    );
    console.log(JSON.stringify(evidence, null, 2));

    if (journal0094.length !== 1) {
      console.error("STOP: 0094 journal count is not 1");
      process.exit(3);
    }
    if (journal0094[0].hash !== CERTIFIED_0094) {
      console.error("STOP: 0094 hash mismatch");
      process.exit(3);
    }
    if (!evidence.schema.lockTableExists) {
      console.error("STOP: commercial_limit_occupancy_locks missing");
      process.exit(3);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ mutation: 0, reason: String(err) }));
  process.exit(1);
});
