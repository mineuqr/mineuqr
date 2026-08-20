# PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 — Validation Report

**Program:** PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1
**Date:** 2026-08-20
**Result:** **PRODUCTION READY INFRASTRUCTURE — NOT ADOPTED**

---

## Certification gates

| Gate | Result | Evidence |
|---|---|---|
| G1 Governance baseline | PASS | ADR-ARCH-039 + supersession decision present; not overwritten |
| G2 Worktree baseline | PASS | Start: `239d03f9` + governance-only dirty tree. Completion: governance is `40bc3b02`; leftover ADR-037 pointer is not implementation |
| G3 Schema implemented | PASS | `drizzle/0096_payment_collection_facts.sql` + `paymentCollectionFacts` |
| G4 Insert-only | PASS | `assertCollectionFactAppendOnly`; `updateCollectionFact`/`deleteCollectionFact` throw `IMMUTABLE` |
| G5 Idempotency | PASS | retry / lost-response / repeat tests |
| G6 Concurrency | PASS | parallel commit → one fact |
| G7 Tenant isolation | PASS | same key, different `restaurantId` → two facts; cross-tenant find is null |
| G8 Server-side authority | PASS | writer requires authorized context; no client PAID flag |
| G9 Financial snapshot | PASS | amount, currency, tax, discount frozen on the fact |
| G10 Tender snapshot | PASS | `cash\|card\|other` tenders must sum to `amount` |
| G11 Shadow/synthetic validation | PASS | `purpose=shadow` + compare helper |
| G12 No Revenue | PASS | Reporting aggregator does not reference Collection Facts |
| G13 No Settlement | PASS | SR/ST repositories do not call the writer |
| G14 No PAID change | PASS | Confirm still Check-finalize; writer does not set Check outcome |
| G15 No Cashier write path | PASS | Confirm / POS settle / Cashier panel / posRouter / sale.create have no writer imports |
| G16 ADR-038 runtime unchanged | PASS | `confirmPayment` → `settleCashierPosOrderPaidByIdDetailed` / `settleCheckPaidByIdDetailed` |
| G17 Other channels unchanged | PASS | Session/Kiosk/Waiter/QR financial services not modified |
| G18 Tests pass | PASS | targeted vitest (see below) |
| G19 `git diff --check` | PASS | run at completion |
| G20 No unrelated code | PASS | Implementation + required 0096 guard updates. Leftover ADR-037 pointer is uncommitted governance and was not mixed or discarded |
| G21 Documentation complete | PASS | README, IMPLEMENTATION-REPORT, this file |

---

## Non-adoption proof (searched after implementation)

No matches for `commitCollectionFact`, `collection-fact`, or `paymentCollectionFacts` in:

- `server/operational-session/payment/PaymentConfirmService.ts`
- `server/pos/services/PosSettlementInitiateService.ts`
- `server/operational-session/check/CheckService.ts`
- `client/src` (Cashier UI)
- `server/pos` (router, sale, settlement initiate)
- `server/reporting-platform`

Architecture guard: `server/operational-session/payment/collection-fact/__tests__/collectionFact.architecture.guards.test.ts`

ADR-038 §7 remains: Cashier Confirm → `confirmPayment(orderId)` → Check materialize+finalize + ST + OS + SR in the existing financial TX. PAID remains Check `outcome = paid`.

---

## Tests

Controlled harness: `InMemoryCollectionFactStore` + `commitCollectionFact`. No Cashier integration. No production DB writes.

Covered:

- unique `collectionFactId`, tenant isolation, sale/order reference
- insert succeeds; UPDATE/DELETE rejected
- identical retry, lost-response simulation, repeated request, concurrent request
- same sale / different intent key (two facts)
- same intent / different idempotency key (conflict)
- conflicting payload (conflict)
- amount, currency, tax, discount, tender snapshot
- unauthorized actor, wrong tenant, invalid terminal, invalid command (including `purpose=production`)
- shadow compare
- isolated in-memory write duration &lt; 250ms (not on Cashier path)

---

## Shadow validation

Existing freeze DTO → `deriveShadowCollectionFactCommand` → write `purpose=shadow` → compare amount, tax, discount, currency, tenders, business day, identity.

Not published as Revenue. Not settled. Original sale not marked PAID.

---

## Performance

Collection Fact writes are **not** on the Cashier payment path, so they add **zero** Confirm latency.

Isolated in-memory commit is measured in unit tests as a sanity bound only. No premature index/query optimization.

---

## Production safety

- Table may be deployed as empty dormant infrastructure
- Writer is not reachable from Cashier Confirm
- `purpose` cannot store production collections
- Dual-write of paid Check + Collection Fact for a real sale is not implemented (I-REV-U-01)

---

## Next certified programs (not this one)

1. REVENUE-UNION-ADOPTION-1
2. CASHIER-FINANCIAL-PATH-ADOPTION-1
3. SETTLEMENT-DECOUPLING
