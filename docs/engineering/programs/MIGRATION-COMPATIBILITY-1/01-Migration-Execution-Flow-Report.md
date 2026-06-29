# MIGRATION-COMPATIBILITY-1 — Migration Execution Flow Report

**Program:** MIGRATION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29  
**Subject:** How `pnpm db:migrate` (`drizzle-kit migrate`) executes SQL on MineuQR

---

## Entry Point

| Item | Value |
|------|-------|
| npm script | `db:migrate` → `drizzle-kit migrate` |
| Config | `drizzle.config.ts` — MySQL dialect, credentials from `DATABASE_URL` |
| Migration folder | `drizzle/` |
| Journal | `drizzle/meta/_journal.json` |
| Applied ledger | `__drizzle_migrations` table in target database |

`drizzle.config.ts` does **not** set `multipleStatements`. TLS is configured for TiDB Cloud hosts.

---

## File Reading & Statement Splitting

**Source:** `node_modules/drizzle-orm/migrator.js` — `readMigrationFiles()`

```javascript
const query = fs.readFileSync(`${migrationFolderTo}/${journalEntry.tag}.sql`).toString();
const result = query.split("--> statement-breakpoint").map((it) => {
  return it;
});
migrationQueries.push({
  sql: result,  // string[] — one element per breakpoint segment
  bps: journalEntry.breakpoints,
  folderMillis: journalEntry.when,
  hash: crypto.createHash("sha256").update(query).digest("hex")
});
```

### Behavior

| Mechanism | Detail |
|-----------|--------|
| **Split delimiter** | `--> statement-breakpoint` only |
| **Semicolon splitting** | **Not performed** |
| **Whole file** | If no breakpoints exist, `migration.sql` is a **single-element array** containing the entire file |
| **Per-migration hash** | SHA-256 of full file contents (including comments) |

Drizzle-kit **generate** inserts `--> statement-breakpoint` between statements (`drizzle-kit/api.js`: `BREAKPOINT = "--> statement-breakpoint\n"`).

---

## Execution Loop (MySQL)

**Source:** `node_modules/drizzle-kit/api.js` — `MySqlDialect.migrate()`

```
1. CREATE TABLE IF NOT EXISTS __drizzle_migrations (if needed)
2. SELECT latest applied migration (created_at DESC LIMIT 1)
3. BEGIN TRANSACTION
4. For each journal migration where folderMillis > last applied:
     For each stmt in migration.sql[]:
       await tx.execute(sql.raw(stmt))    ← one COM_QUERY per array element
     INSERT hash + created_at into __drizzle_migrations
5. COMMIT
```

| Property | Value |
|----------|-------|
| **Transaction** | Yes — entire pending migration batch in one transaction |
| **Statement batching** | One `execute()` per `migration.sql[]` element |
| **Multi-statement per execute** | Only if a single array element contains multiple `;`-terminated statements |

---

## mysql2 Driver Layer

**Source:** `node_modules/mysql2/lib/connection_config.js`

```javascript
this.multipleStatements = options.multipleStatements || false;  // default false
```

When `multipleStatements` is false (default):

- mysql2 does **not** set `CLIENT_MULTI_STATEMENTS` on connect
- A single `connection.execute(sql)` with multiple semicolon-separated statements sends **one COM_QUERY** with multiple statements
- TiDB rejects this when the client multi-statement capability is disabled

MineuQR `drizzle.config.ts` and `server/db.ts` do **not** enable `multipleStatements`.

---

## Implication for 0046

`0046_order_read_projections.sql`:

- Contains **7** `CREATE TABLE` statements
- Contains **0** `--> statement-breakpoint` markers
- Produces `migration.sql.length === 1`
- drizzle-kit sends **one COM_QUERY** with 7 statements
- TiDB returns: `client has multi-statement capability disabled`

---

## Flow Diagram

```
_journal.json → read .sql file
       ↓
split by "--> statement-breakpoint"
       ↓
migration.sql[] (array of SQL strings)
       ↓
for each stmt: tx.execute(sql.raw(stmt))  → mysql2 → TiDB COM_QUERY
```

**Failure point:** When `migration.sql` has one element containing multiple `;`-separated DDL statements, and `multipleStatements` is false.
