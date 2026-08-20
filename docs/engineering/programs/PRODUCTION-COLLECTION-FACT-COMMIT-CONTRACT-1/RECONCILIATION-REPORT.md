# PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — Reconciliation Report

**Result: PASS — IMPLEMENTED / VALIDATED / NOT ADOPTED**

Reconciles program requirements to evidence. Does not claim Cashier, PAID, Settlement, or production Collection Fact adoption.

---

## Success criteria

| # | Criterion | Evidence |
|---|---|---|
| 1 | Single canonical production commit contract | `productionCollectionFactCommitContract.ts` + [CONTRACT-SPECIFICATION.md](./CONTRACT-SPECIFICATION.md) |
| 2 | Financial snapshot explicit | `PRODUCTION_COLLECTION_FACT_SNAPSHOT`; schema columns reused, no new fields of convenience |
| 3 | Idempotency deterministic and tested | tenant+key+fingerprint replay; conflict on payload/intent; tests J/K/L |
| 4 | Economic identity explicit | `restaurantId + orderingChannel + orderId`; business day not identity |
| 5 | Terminal semantics explicit | mandatory production attribution; not fingerprint identity; isolated may omit |
| 6 | Commit/finality explicit | COMMITTED = PAID = one insert/replay; HTTP after; ST/OS/SR downstream |
| 7 | Immutability enforced and tested | domain Readonly, writer insert/replay, repo `IMMUTABLE`, uniqueness indexes |
| 8 | Duplicate/retry proven | writer tests J/K/L/M |
| 9 | Downstream failure explicit | `PRODUCTION_COLLECTION_FACT_FAILURE.downstreamSettlementFailure` + test R |
| 10 | Channel-independent | shared Payment collection-fact module; waiter_tablet fixture; no Cashier import |
| 11 | Cashier not adopted | Confirm/panel/settle/sale/router guards; payment index still exports only `confirmPayment` |
| 12 | Production facts not written | no migration, no deploy, no production INSERT in this program |
| 13 | No second financial authority | no payments table, no Payment aggregate, kind remains `collection` |
| 14 | No second PAID entity | PAID is a label of the committed fact; Confirm PAID path unchanged |
| 15 | ST/OS/SR remain downstream | Check/SR/ST/OS repos do not call writer; commit path does not call settlement |
| 16 | Relevant tests PASS | 24 files / 160 tests; governance guard OK |
| 17 | No unauthorized production migration/deploy | journal tail 0097; no 0098 |
| 18 | Documentation evidence | this program folder |

---

## Hard stops — none triggered

| Condition | Finding |
|---|---|
| Collection Fact cannot be immutable | Existing insert-only writer + `IMMUTABLE` UPDATE/DELETE remain |
| Production commit requires a second financial authority | Rejected; fact is the authority for the new path |
| Cashier must define the contract | Contract is shared Payment collection-fact |
| Check must remain financial authority for the new path | Check is optional `checkId` reference only |
| PAID requires a second financial write | COMMITTED and PAID are one outcome |
| ST/OS/SR must remain inside Payment Commit | Explicitly downstream; not implemented here |
| Production migration required | Existing 0096/0097 columns sufficient |
| Existing data requires mutation/backfill | Production row count in scope remains 0; no backfill |
| Refund/void/complimentary must be invented | Documented as future compensating events |
| Contract would inflate Cashier payment critical path | Cashier not connected; validation set is snapshot-only |
| Existing architecture contradicts the target model | Aligns with ADR-039 target; live runtime still Check PAID until adoption |

---

## Scope discipline

| In scope | Done |
|---|---|
| Contract definition, snapshot, idempotency, identity, terminal, finality | yes |
| Validation invariants, failure/retry, immutability | yes |
| Tests, architecture guards, documentation | yes |

| Out of scope | Not done |
|---|---|
| Cashier UI / Confirm / PAID / Check migration | not done |
| ST/OS/SR / Reporting cutover | not done |
| Refund/void/complimentary / offline / gateways | not done |
| New payments table / Payment aggregate | not done |
| 0098 / production writes / backfill | not done |

---

## Dual meaning of PAID (explicit, not a second entity)

- **Adopted meaning (this contract):** PAID = committed Collection Fact.
- **Live runtime today (unchanged):** PAID = Check settled via `confirmPayment`.

Those are not two production Collection Fact authorities. They are the certified target versus the still-live legacy path. This program does not cut over.

---

## Git

Do **not** commit or push unless separately authorized.

Proposed message:

```
certify the production Collection Fact commit contract without Cashier adoption
```
