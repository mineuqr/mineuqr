/**
 * Read-only: confirm 0089 hash absent; map latest journal hash to local tag.
 */
import "dotenv/config";
import {
  createAuditReadonlyConnection,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";
import { buildJournalHashMap } from "../../../../scripts/lib/migration-governance-lib.cjs";

async function main() {
  const url = process.env.DATABASE_URL;
  const hashes = buildJournalHashMap();
  const hashToTag = new Map([...hashes.entries()].map(([tag, hash]) => [hash, tag]));
  const conn = await createAuditReadonlyConnection(url);
  try {
    const [latest] = await conn.execute(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 1"
    );
    const [count0089] = await conn.execute(
      "SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?",
      ["99d6e25671cea14cabe5b45d496735647b66d5d1a0ef23cfc46cadda1458c571"]
    );
    const [count0088] = await conn.execute(
      "SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?",
      ["0836fac35ca3515db9958e232320dd9e0f5d44bf60684d74badff8661daa243b"]
    );
    const row = Array.isArray(latest) ? latest[0] : null;
    console.log(
      JSON.stringify(
        {
          mutation: "NONE",
          latest_hash: row?.hash ?? null,
          latest_tag: hashToTag.get(row?.hash) ?? "UNMAPPED",
          count_hash_0088: Number(count0088[0]?.n ?? 0),
          count_hash_0089: Number(count0089[0]?.n ?? 0),
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
  console.error(JSON.stringify({ mutation: "NONE", reason: String(e) }));
  process.exit(1);
});
