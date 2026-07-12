# PRODUCTION-MIGRATION-GOVERNANCE-RECOVERY-0063-1

**Classification:** Operational Governance  
**Status:** COMPLETE — governance GREEN (no production migration executed)

## Root Cause

Migration `0063_screen_credential_ciphertext.sql` was **hand-authored** in commit `bc30ff2` (`SCREEN-CREDENTIAL-LIFECYCLE-1`) alongside `drizzle/schema.ts` changes. The certified `drizzle-kit generate` journal registration step was **not completed**, leaving SQL on disk as a non-legacy orphan outside `_journal.json`.

This matches the historical anti-pattern documented in MIGRATION-GOVERNANCE-RESTORATION-1 (SQL committed without journal entry).

## Recovery Actions

| Artifact | Change |
|----------|--------|
| `drizzle/meta/_journal.json` | Added idx 63 entry `0063_screen_credential_ciphertext` |
| `scripts/lib/migration-governance-lib.cjs` | `CANONICAL_MIGRATION_TAIL_TAG` → 0063; entry count → 64 |
| `scripts/migration-governance-guard.cjs` | Success/range messages updated to 0000–0063 |
| `scripts/__tests__/migrationGovernance.test.ts` | Tail assertions updated |
| `docs/DB_MIGRATION_GOVERNANCE.md` | Canonical lineage updated |

**Not changed:** `0063_screen_credential_ciphertext.sql` (SQL semantics unchanged), `schema.ts`, application code.

## Validation

```bash
pnpm db:governance-check   # PASS
pnpm exec vitest run scripts/__tests__/migrationGovernance.test.ts
```

## SQL Hash (SHA-256)

```
401e47cfe71cf752f7f5af4a86c7eff1cd554632ea7dcdaed487ae51db4cb0c1
```

## Next Step

Production apply remains a separate task: `PRODUCTION-MIGRATION-EXECUTION-0063` (requires backup confirmation + `pnpm db:migrate`).
