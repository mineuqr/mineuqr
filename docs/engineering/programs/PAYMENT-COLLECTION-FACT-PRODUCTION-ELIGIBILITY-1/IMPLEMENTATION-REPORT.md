# PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1 — Implementation Report

**Status: IMPLEMENTED — NOT ADOPTED (Cashier / production writes / 0097 execution)**

Baseline HEAD: `3bfdee06` `feat(reporting): publish revenue union pipeline`.

## Files

| Area | Path |
|---|---|
| Purpose taxonomy | `shared/operational-session/payment/collection-fact/collectionFactContract.ts` |
| Purpose governance | `shared/operational-session/payment/collection-fact/collectionFactPurposeGovernance.ts` |
| Published allowlist | `shared/reporting-platform/revenue-union/revenueUnionContract.ts` |
| Isolated vs published resolver | `shared/reporting-platform/revenue-union/revenueUnionResolver.ts` |
| Drizzle enum | `drizzle/schema.ts` |
| Migration | `drizzle/0097_payment_collection_facts_production_purpose.sql` |
| Journal / tail | `drizzle/meta/_journal.json`, `scripts/lib/migration-governance-lib.cjs` |
| Verify-schema enum member | `scripts/verify-schema-deployment.cjs` |

Not modified: Cashier UI, `PaymentConfirmService`, `CheckService` writers, Settlement writers, `posRouter`, `sale.create`. No ADR files.

## Writer

`commitCollectionFact` now accepts `purpose=production` in the isolated Payment collection-fact module. It is still **not** exported from `server/operational-session/payment/index.ts` and is still **not** called from Confirm or Cashier.

This program does not authorize runtime production writes.

## Published eligibility

```
PUBLISHED_COLLECTION_FACT_PURPOSES = ["production"]
```

Isolated purposes remain `isolated` eligibility only (tests/shadow).
