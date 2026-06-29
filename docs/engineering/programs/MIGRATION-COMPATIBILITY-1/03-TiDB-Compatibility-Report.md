# MIGRATION-COMPATIBILITY-1 — TiDB Compatibility Report

**Program:** MIGRATION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29

---

## Error Under Investigation

```
client has multi-statement capability disabled
```

TiDB error code **8130** (HY000): *"client has multi-statement capability disabled"*

---

## TiDB Server Behavior

Since TiDB 4.0.9+, TiDB restricts executing multiple SQL statements in a single `COM_QUERY` unless:

1. The client sets **`CLIENT_MULTI_STATEMENTS`** capability at connect time, OR
2. Server-side `tidb_multi_statement_mode` is configured to permit it

**Source:** [TiDB Error Codes — 8130](https://docs.pingcap.com/tidb/stable/error-codes)

TiDB checks the client capability flag:

```go
if capabilities&mysql.ClientMultiStatements < 1 {
    return errMultiStatementDisabled  // "client has multi-statement capability disabled"
}
```

**Source:** TiDB server source (`clientConn.handleQuery`)

This is an **intentional security control** against SQL injection via statement termination (`'; DROP TABLE ...`).

---

## mysql2 Client Behavior

| Setting | Default | MineuQR |
|---------|---------|---------|
| `multipleStatements` | `false` | `false` (not set in `drizzle.config.ts` or `server/db.ts`) |

When `multipleStatements: false`:

- mysql2 does not advertise `CLIENT_MULTI_STATEMENTS`
- `connection.execute("SELECT 1; SELECT 2")` sends one packet with two statements
- TiDB rejects with error 8130

When `multipleStatements: true`:

- Client advertises multi-statement capability
- TiDB accepts multiple statements per COM_QUERY

**Enabling `multipleStatements` globally is discouraged** — increases SQL injection surface for application queries, not just migrations.

---

## drizzle-orm / drizzle-kit Behavior

| Layer | Multi-statement handling |
|-------|-------------------------|
| `readMigrationFiles` | Splits on `--> statement-breakpoint` only |
| `MySqlDialect.migrate` | One `execute()` per split segment |
| mysql2 session | `multipleStatements: false` (default) |
| Transactions | Wraps all pending migrations |

Drizzle's **designed** TiDB/MySQL compatibility path is **one statement per `execute()`**, achieved via statement breakpoints — not via `multipleStatements: true`.

---

## Compatibility Matrix

| Scenario | TiDB | mysql2 default | Result |
|----------|------|----------------|--------|
| Single statement per execute | ✓ | ✓ | PASS |
| Multiple statements, breakpoints, one per execute | ✓ | ✓ | PASS |
| Multiple statements, one execute, `multipleStatements: false` | ✗ | ✓ (default) | **FAIL 8130** |
| Multiple statements, one execute, `multipleStatements: true` | ✓ | requires config | PASS (not recommended) |

---

## Classification of Incompatibility

| Factor | Role |
|--------|------|
| **Migration structure (0046)** | **Primary cause** — 7 statements, no breakpoints |
| **Drizzle implementation** | **Contributing** — no semicolon split fallback |
| **mysql2 configuration** | **Contributing** — correct secure default |
| **TiDB limitation** | **Enforcement layer** — by design, not a bug |

The failure is **not** TiDB rejecting valid DDL syntax. TiDB rejects **packaging**: multiple statements in one client query without multi-statement capability.

---

## TiDB Cloud Specifics

- TiDB Cloud Serverless/Tier requires TLS — MineuQR handles this in `drizzle.config.ts`
- Multi-statement policy applies to Cloud same as self-hosted TiDB
- Changing `tidb_multi_statement_mode` globally on shared Cloud clusters is **not** a recommended migration fix

---

## Verdict

TiDB is **compatible** with MineuQR's migration approach when migrations follow Drizzle's statement-breakpoint convention.

0046 violates that convention. TiDB correctly enforces its multi-statement policy.
