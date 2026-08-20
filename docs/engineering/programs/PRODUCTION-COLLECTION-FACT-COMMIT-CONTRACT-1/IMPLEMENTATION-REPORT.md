# PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — Implementation Report

**Status: IMPLEMENTED / VALIDATED / NOT ADOPTED**

No Cashier adoption. No Confirm/PAID/Settlement runtime change. No production writes. No 0098.

---

## What was implemented

1. Canonical contract module
   `shared/operational-session/payment/collection-fact/productionCollectionFactCommitContract.ts`
   Identity vocabulary, snapshot catalog, finality labels, failure map, `assertProductionCollectionFactCommit`.

2. Writer enforcement
   `commitCollectionFact` calls the production assert **only** when `purpose === production`. Isolated purposes keep prior rules (terminal/actor may be omitted).

3. Shared barrel export
   Contract symbols exported from `shared/operational-session/payment/collection-fact/index.ts`.
   `commitCollectionFact` remains **not** exported from `server/operational-session/payment/index.ts` (Confirm barrel).

4. Contract tests + architecture guards (new files only). Existing tests were **not** modified.

---

## What was not implemented (by design)

- Cashier UI / Confirm / `settleCashierPosOrderPaidByIdDetailed` / Check PAID
- ST / OS / SR writers
- Revenue Union changes
- Refund / void / complimentary Collection Fact kinds
- Production INSERT
- Schema migration
- Payments table / Payment aggregate / second PAID entity

---

## Files

### Modified

- `server/operational-session/payment/collection-fact/CollectionFactService.ts` — production-purpose assert + program comment
- `shared/operational-session/payment/collection-fact/index.ts` — export contract

### Added

- `shared/operational-session/payment/collection-fact/productionCollectionFactCommitContract.ts`
- `shared/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommitContract.test.ts`
- `server/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommit.test.ts`
- `server/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommit.architecture.guards.test.ts`
- `docs/engineering/programs/PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1/*`

---

## Runtime impact

**None on live payment paths.** Confirm still settles Checks. Cashier still does not call `commitCollectionFact`.

The dormant writer is stricter for `purpose=production` (mandatory terminal + actor + tax snapshot match). Isolated harness behavior is unchanged.

---

## Production impact

**None authorized.** No migration. No deploy. No Collection Fact INSERT/UPDATE/DELETE against production.

---

## Dependencies left for later programs

- Cashier (or other channel) adoption of this contract at Payment Commit
- Confirm/PAID meaning cutover from Check outcome to Collection Fact
- Downstream ST/OS/SR publication after Collection Commit (must not mutate the fact)
- Collection Fact-native compensating events for refund/void/complimentary
