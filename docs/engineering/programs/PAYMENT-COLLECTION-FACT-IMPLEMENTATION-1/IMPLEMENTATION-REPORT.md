# PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 — Implementation Report

**Program:** PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1
**Date:** 2026-08-20
**Decision:** **PRODUCTION READY INFRASTRUCTURE — NOT ADOPTED**
**Authority:** [ADR-ARCH-039](../../../architecture/adrs/ADR-ARCH-039-payment-collection-financial-authority.md), [FINANCIAL-AUTHORITY-SUPERSESSION-ADR-1](../FINANCIAL-AUTHORITY-SUPERSESSION-ADR-1/FINANCIAL-AUTHORITY-SUPERSESSION-DECISION.md)

---

## 1. Git baseline (G1, G2)

Inspected before any implementation file was written.

**At program start:**

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `239d03f9` `docs(architecture): record cashier direct financial commit production validation` |
| `origin/main` | `29db3a10` `fix(cashier): remove payment readiness display flicker` |
| Why main was ahead of origin | One local documentation commit for cashier direct-commit production validation. Not Collection Fact implementation. |
| Staged | none |
| Uncommitted | Governance reset only (ADR pointers, ADR-039, supersession docs). No application/runtime/schema changes. |

**At program completion:**

| Item | Value |
|---|---|
| HEAD / `origin/main` | `40bc3b02` `docs(financial): establish payment collection financial authority` |
| Note | Governance was committed on `main` (not by this program’s implementation commit). This program did not amend that commit and did not push. |
| Leftover governance (uncommitted, not discarded) | `docs/architecture/adrs/ADR-ARCH-037-payment-process-domain.md` — ADR-039 supersession pointer. CRLF-dirty; **not** implementation. |
| Implementation | Uncommitted and isolated (schema, writer, tests, program docs). |

Safe baseline. Governance ADRs were not overwritten. No cleanup commit was made.

---

## 2. Files changed (implementation)

### Schema / governance

- `drizzle/0096_payment_collection_facts.sql`
- `drizzle/meta/_journal.json` (idx 96)
- `drizzle/schema.ts` (`paymentCollectionFacts`)
- `scripts/lib/migration-governance-lib.cjs` (tail `0096_payment_collection_facts`, count 97)
- `scripts/migration-governance-guard.cjs`
- `scripts/verify-schema-deployment.cjs`
- `scripts/__tests__/migrationGovernance.test.ts`

### Domain / writer

- `shared/operational-session/payment/collection-fact/*`
- `server/operational-session/payment/collection-fact/*`
- `server/_core/opsTaxonomy.ts` (Collection Fact ops events)

### Tests / non-adoption guards

- New Collection Fact unit + architecture tests
- Historical “no 0096” guards updated to **allow** `0096_payment_collection_facts` and still **forbid** `0096_payments` / `mysqlTable("payments")`

Not modified: `PaymentConfirmService`, `PosSettlementInitiateService`, `CheckService`, Cashier UI, `pos.sale.create`, Reporting, Settlement Record runtime, refund runtime.

---

## 3. Schema

Table `payment_collection_facts` (additive CREATE TABLE, no FKs, no ALTER of Check/SR/orders):

| Concern | Column(s) |
|---|---|
| Identity | `collectionFactId` unique |
| Tenant | `restaurantId` |
| Sale / intent | `orderId`, `paymentIntentId` |
| Channel | `orderingChannel` |
| Kind | `collection` only (this program) |
| Isolation | `purpose` enum `synthetic\|shadow\|test\|validation` (required; no production) |
| Frozen money | `subtotal`, `discountAmount`, `taxAmount`, `amount`, `currencyCode` |
| Snapshots | `currencySnapshotJson`, `taxPolicySnapshotJson`, `taxBreakdownJson`, `compositionJson` |
| Tenders | `tendersJson` (`cash\|card\|other`) |
| Actor / terminal | `actorType`, `actorId`, `terminalId` |
| Business day | `businessDay` |
| Idempotency | `idempotencyKey`, `fingerprint` |
| Time | `committedAt`, `createdAt` |
| Operational ref | `checkId` nullable, **no FK**, not authority |

Uniqueness:

- `(restaurantId, idempotencyKey)` — same intent retry
- `(restaurantId, paymentIntentId)` — I-COL-01 one fact per intent

SQL hash (utf8 file bytes): `ae387c23fc92e9ac9769552f125fec5780d58eff3af59c3baa6306c235a0cb1f`

---

## 4. Ownership

Payment collection-fact module owns the writer. Reporting, Settlement, Check UI, Cashier UI, Order Read, and Dashboard do not.

`confirmPayment` remains the production Payment process and still delegates to Check settle (ADR-038). Collection Fact is **not** on that path.

---

## 5. Idempotency and concurrency

Reuse of the platform pattern: SHA-256 fingerprint (same idea as POS settlement initiate) + MySQL duplicate-key 1062 handling (same idea as Settlement Record insert).

Behavior:

1. Identical retry / lost response / repeated request → same fact (`replayed`)
2. Concurrent same intent → one insert winner; loser replays or conflicts
3. Same sale, different `paymentIntentId` + key → two facts (partials)
4. Same intent, different key → `CONFLICT`
5. Same key, different fingerprint → `CONFLICT`
6. Tenant isolation on `(restaurantId, key)` and `(restaurantId, factId)`

---

## 6. Immutability

Repository exposes `insert` + finds only. `updateCollectionFact` / `deleteCollectionFact` call `assertCollectionFactAppendOnly` and fail with `IMMUTABLE`. No `updatedAt`. Amount, currency, tenders, restaurant, sale, actor, and business day are not rewriteable through the writer.

---

## 7. Security

- Server-side writer only; no Cashier/tRPC production payment endpoint
- Context `actorAuthorized` + tenant match required
- Canonical tenders only (`cash|card|other`); no card credentials stored
- Ops logs: purpose, ids, outcome codes — not amounts, tenders, or PAN/PII

---

## 8. Financial snapshot

Frozen at commit (I-COL-06 / I-COL-09): subtotal, discount, tax, amount, currency snapshot, tax policy snapshot, tax breakdown, composition lines, tenders. Historical meaning does not require reading mutable Check state. `checkId` is an optional operational pointer only.

Tender gap: none for this program. Existing catalog is sufficient. Complimentary remains a later compensating `kind`, not a Collection Fact tender.

---

## 9. Shadow validation

`deriveShadowCollectionFactCommand` + `compareCollectionFactToFreeze` build and compare a candidate fact from a freeze DTO. Tests write `purpose=shadow|test` via the in-memory harness. The original sale is not marked PAID. The fact is not settled and is not Revenue.

---

## 10. Observability

| Event | Meaning |
|---|---|
| `payment_collection_fact_commit_attempt` | Writer entered |
| `payment_collection_fact_committed` | Insert succeeded |
| `payment_collection_fact_replayed` | Idempotent replay |
| `payment_collection_fact_duplicate_prevented` | Second intent blocked |
| `payment_collection_fact_validation_failed` | Invalid command |
| `payment_collection_fact_authorization_failed` | Actor/tenant denied |
| `payment_collection_fact_storage_failed` | Persistence error |

---

## 11. Production impact

Dormant infrastructure only. Existing transactions do not change because Confirm, Revenue, Settlement, and PAID were not wired. Deploying the table does not create production collections: `purpose` cannot be `production`.

---

## 12. API boundary

Internal domain/service only (`commitCollectionFact` + `CollectionFactStore`). No Cashier UI, no `pos.settlement.initiate` change, no public payment endpoint.

---

## 13. Historical guard updates

Several prior programs asserted “no 0096”. Those assertions meant “no `payments` table / no second Check money root.” They were updated to:

- keep `0095_check_charges`
- allow `0096_payment_collection_facts` (this dormant infra)
- continue to forbid `0096_payments` and `mysqlTable("payments")`
