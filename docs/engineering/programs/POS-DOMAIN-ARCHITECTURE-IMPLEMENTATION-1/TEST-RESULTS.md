# TEST RESULTS

**Date:** 2026-08-16
**Command (POS certification suite):**

```
pnpm exec vitest run \
  shared/pos/__tests__/posDomain.foundation.test.ts \
  server/pos/__tests__/posTerminal.domain.test.ts \
  server/pos/__tests__/posEntitlement.test.ts \
  server/pos/__tests__/posAccess.test.ts \
  server/pos/__tests__/pos.architecture.guards.test.ts \
  server/pos/__tests__/posChannel.preservation.test.ts \
  server/pos/__tests__/posCommercial.integration.test.ts \
  scripts/__tests__/migrationGovernance.test.ts \
  shared/ordering-platform/__tests__/orderingChannelGovernance.architecture.guards.test.ts
```

**Result:** 9 files, **47 passed / 0 failed**

Additional Live Plan limits regression: `commercialLivePlans.limits.repair.test.ts` — **10 passed / 0 failed**

Governance guard: `node scripts/migration-governance-guard.cjs` — OK (terminus `0091_pos_terminals`, 92 entries)

## Coverage of required negatives

| # | Case | Result |
|---|------|--------|
| 1 | Restaurant A cannot access Restaurant B terminal | PASS |
| 2 | Provisioning cannot exceed Live Plan limit | PASS |
| 3 | Missing POS quantity does not grant unlimited | PASS |
| 4 | Client cannot override entitlement | PASS |
| 5 | Client cannot override restaurant ownership | PASS (requireOwned + assertRestaurantAccess) |
| 6 | Inactive terminal cannot be used for POS access | PASS |
| 7 | User without POS grant cannot access POS | PASS |
| 8 | Operational Device is not POS Terminal | PASS |
| 9 | POS cannot use devices as quantity | PASS |
| 10–12 | POS does not create Order / Check / Settlement | PASS (guards) |
| 13 | Table/QR not rewritten to cashier_pos on settle | PASS |
| 14 | Duplicate same-code registration is idempotent | PASS |

## Build / check

| Gate | Result |
|------|--------|
| `pnpm build` | PASS (exit 0) |
| `pnpm check` | PRE-EXISTING — exit 2, **188** `error TS*` diagnostics, **zero** in this program's POS / limit / channel / 0091 files |
