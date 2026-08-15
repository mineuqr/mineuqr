# PRODUCTION-APPLY

**Not executed in this program.**

**0088 Production application was NOT executed.**  
**Production data was NOT modified by this correction program.**

## Required future sequence (not authorized here)

1. TiDB backup.
2. Fresh read-only preflight (do not reuse OD-5 counts):

```
node scripts/0088-live-plan-identity-preflight.mjs
```

3. Only if preflight is `PASS`: `pnpm db:migrate` (applies amended 0088).
4. The SQL gate must also pass before `DROP COLUMN planId`.

Mapping remains:

```
integer → commercial_plans.code → commercial_plans.id
```

Do not hard-code UUIDs. Do not rewrite Charged Terms.
