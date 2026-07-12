# MIGRATION-COMPATIBILITY-0063-1

**Classification:** Production Migration Compatibility  
**Status:** COMPLETE — compatibility restored (no production migrate executed)

## Root Cause

Migration `0063` was hand-authored with **snake_case** column identifiers (`secret_ciphertext`, `secret_hash`). The certified production lineage for `operational_device_tokens` (from `0054` through `0060`) uses **camelCase** (`secretHash`, `activationCodeHash`, etc.), matching `drizzle/schema.ts`.

Production `pnpm db:migrate` failed with `ER_BAD_FIELD_ERROR` (1054): `Unknown column 'secret_hash'`.

## Compatibility Analysis

| Artifact | `operational_device_tokens` column naming |
|----------|-------------------------------------------|
| `0054_operational_devices.sql` | camelCase: `secretHash`, `tokenId`, `deviceId` |
| `0060_device_activation_code.sql` | camelCase: `activationCodeHash`, `activationCodeExpiresAt` |
| `drizzle/schema.ts` | camelCase: `secretHash`, `secretCiphertext` |
| `0063` (before fix) | **snake_case** — incompatible |

No other identifiers in 0063 referenced tables, indexes, enums, or constraints. Single `ALTER TABLE` — only the new column name and `AFTER` anchor were wrong.

## SQL Correction

```sql
ADD COLUMN `secretCiphertext` varchar(512) NULL AFTER `secretHash`;
```

Intent unchanged: nullable `varchar(512)` recovery column immediately after authentication hash column.

## Governance Impact

- Journal entry `0063_screen_credential_ciphertext` unchanged (tag stable).
- Migration **file hash** changes (expected when SQL is corrected).
- `pnpm db:governance-check` — re-validated PASS.
- Production `__drizzle_migrations` unchanged (0063 not yet applied).

## Next Step

Separate program: `PRODUCTION-MIGRATION-EXECUTION-0063` (re-run after operator approval).
