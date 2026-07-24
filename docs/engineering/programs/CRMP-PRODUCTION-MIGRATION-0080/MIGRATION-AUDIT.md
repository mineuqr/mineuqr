# CRMP-PRODUCTION-MIGRATION-0080 — Migration Audit

| Field | Value |
|---|---|
| **Program** | CRMP-PRODUCTION-MIGRATION-0080 |
| **Migration** | `drizzle/0080_crmp_register_catalog.sql` |
| **SHA-256** | `9d93a2c23a8a84b19c146482bf33805474f4eb2ed5cb040b2853e7e08e414bae` |
| **Verdict** | **APPROVED FOR PRODUCTION EXECUTE** |

## Statements (in order)

1. `ADD COLUMN code varchar(64) NULL`
2. `ADD COLUMN registerType enum(...) NOT NULL DEFAULT 'counter'`
3. `ADD COLUMN archivedAt timestamp NULL`
4. `UPDATE ... SET code = CONCAT('R', id) WHERE code IS NULL OR code = ''` — schema-completion backfill only
5. `MODIFY COLUMN code varchar(64) NOT NULL`
6. `CREATE UNIQUE INDEX crmp_registers_restaurant_code_unique (restaurantId, code)`
7. `CREATE INDEX crmp_registers_restaurant_type (restaurantId, registerType)`

## Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Additive | **PASS** | ADD COLUMN + CREATE INDEX only |
| Deterministic | **PASS** | Fixed DDL; backfill formula `R{id}` |
| Idempotent (drizzle hash) | **PASS** | Applied once via `__drizzle_migrations` |
| Backward compatible | **PASS** | New columns; defaults for type; Duty columns untouched |
| No DROP / TRUNCATE | **PASS** | Absent |
| No destructive SQL | **PASS** | Absent |
| No ownership changes | **PASS** | `crmp_registers` only |
| No Check / SR / Reporting / Shift DDL | **PASS** | Absent |
| Data rewrite | **N/A → PASS** | Conditional backfill only for null/empty `code` to enable NOT NULL. Empty table = no-op. Does not rewrite business tender/settlement data. |

## STOP scan

| Stop trigger | Hit? |
|--------------|------|
| Destructive SQL | No |
| Ownership redesign | No |
| Non-additive schema | No |

**APPROVED.**
