# MIGRATION-COMPATIBILITY-1 — Canonical Migration Policy (Recommendation)

**Program:** MIGRATION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29  
**Status:** RECOMMENDATION — not implemented

---

## Policy Statement

All MineuQR Drizzle journal migrations targeting TiDB Cloud **MUST** be executable with:

- `multipleStatements: false` (mysql2 default)
- `drizzle-kit migrate` (standard path)
- No server-side `tidb_multi_statement_mode` changes

---

## Rule 1 — Generate, Don't Hand-Write

| Requirement | Detail |
|-------------|--------|
| Primary path | `pnpm db:generate` after `drizzle/schema.ts` changes |
| Hand-written SQL | Requires Principal Engineer review |
| Breakpoint markers | **Mandatory** when file contains >1 statement |

---

## Rule 2 — One Statement Per Execute

Equivalent enforceable checks:

```
IF count(SQL statements separated by ';') > 1
THEN count('--> statement-breakpoint') MUST BE >= count(statements) - 1
```

**Preferred packaging:**

| Pattern | When |
|---------|------|
| One DDL per migration file | New tables, high-risk DDL |
| Multiple DDL with breakpoints | drizzle-kit generated bundles |
| Never | Multiple DDL without breakpoints |

---

## Rule 3 — Journal Integrity

| Requirement | Detail |
|-------------|--------|
| Every `####_*.sql` in journal | Must exist on disk |
| Orphan SQL files | Must not be applied manually |
| `pnpm db:preflight` | Run before staging/production migrate |
| Post-migrate verify | `pnpm db:verify-schema` |

---

## Rule 4 — TiDB-Specific Constraints

| Constraint | Policy |
|------------|--------|
| Multi-statement COM_QUERY | Prohibited without breakpoints |
| `multipleStatements: true` | **Prohibited** in app and migrate config |
| TLS | Required for `*.tidbcloud.com` (already in `drizzle.config.ts`) |
| FK additions | One `ALTER TABLE` per migration (existing pattern 0040–0042) |

---

## Rule 5 — DDL Packaging Examples

### ✓ Allowed — single statement

```sql
CREATE TABLE `example` ( `id` int NOT NULL, PRIMARY KEY (`id`) );
```

### ✓ Allowed — drizzle-kit style

```sql
CREATE TABLE `a` ( ... );
--> statement-breakpoint
CREATE TABLE `b` ( ... );
```

### ✗ Prohibited — multi-statement without breakpoints

```sql
CREATE TABLE `a` ( ... );

CREATE TABLE `b` ( ... );
```

---

## Rule 6 — Pre-Merge CI Gate (Recommended)

Add readonly audit script (future):

```javascript
// Fail if journal migration has creates > 1 && !includes('statement-breakpoint')
```

Mirror the investigation scan that identified 0046 as the sole violator.

---

## Rule 7 — Large Schema Changes

For projection-store-scale changes (7+ tables):

| Approach | Recommendation |
|----------|----------------|
| Single migration, breakpoint-separated | Acceptable |
| One migration per table (0046a–g) | Preferred for rollback clarity |
| Single file, semicolon-separated | **Forbidden** |

---

## Rule 8 — Rollback Documentation

Each migration SQL file header should include:

- Program ID
- Rollback SQL comment (manual)
- Pre-flight script reference if applicable

---

## Summary

> **MineuQR migrations must assume TiDB single-statement-per-COM_QUERY unless Drizzle statement breakpoints split them.**

This aligns with Drizzle's design, mysql2 secure defaults, and TiDB Cloud security policy.
