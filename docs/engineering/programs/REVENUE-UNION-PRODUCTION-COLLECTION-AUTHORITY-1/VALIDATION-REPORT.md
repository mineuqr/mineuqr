# VALIDATION-REPORT

Program: `REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1`

**Certification: PASS — IMPLEMENTED / VALIDATED / NOT DEPLOYED**

Not claimed: Cashier adoption, Confirm/PAID change, live production Collection
Fact revenue, production writes, migration 0098.

---

## Suites run (this program)

| Suite | Result |
|---|---|
| `revenueUnion.test.ts` | **20 passed** (isolated BOTH preserved; published CF-wins) |
| `revenueUnionProductionAuthority.test.ts` | **17 passed** (cases 1–13 / invariants) |
| `BusinessMetricsService.settlementRecord.test.ts` | **8 passed** |
| `refundReportingAdoption.test.ts` | **7 passed** |
| `RevenueUnionService.test.ts` | **2 passed** |
| `businessMetricsFromUnion.productionAuthority.test.ts` | **2 passed** |
| Union architecture guards (adoption + published + this program) | **12 passed** |
| Collection Fact contract / writer / execution + architecture | **passed** |
| `paymentConfirm.architecture.guards.test.ts` | **passed** |
| `settlementRecordRepository.test.ts` | **passed** |
| `node scripts/migration-governance-guard.cjs` | **OK — last tag 0097** |

Existing tests were not removed to make the new rule pass.

---

## Invariants

| Id | Result |
|---|---|
| I-1 published Gross count ≤ 1 per proven sale | PASS |
| I-2 valid production CF cannot coexist with published legacy Gross for that sale | PASS |
| I-3 unrelated legacy sale not suppressed | PASS |
| I-4 amount equality alone is not overlap | PASS |
| I-5 checkId equality alone is not overlap | PASS |
| I-6 distinct paymentIntentId remain distinct (unless same sale key duplicate) | PASS |
| I-7 isolated facts never production authority | PASS |
| I-8 invalid production facts never supersede legacy | PASS |
| I-9 duplicate production facts cannot publish twice | PASS |
| I-10 deterministic | PASS |
| I-11 side-effect free | PASS |
| I-12 Union does not insert/update/delete Collection Facts | PASS (architecture + I-11) |

---

## Architecture guards

Proved: no Cashier/Confirm/PAID/Check/ST/OS/SR writer changes; no
`commitCollectionFact` in Union; reporting adapter remains read-only; no
`mysqlTable("payments")`; no 0098; journal remains 0097; no refund/void/
complimentary Collection Fact kinds introduced by Union files.

---

## Known gaps (not in scope)

1. Settlement Record `orderRefs` carry `orderId` only. Channel is enforced
   only when the Union legacy fact has a channel. Live SR mapping currently
   supplies `orderIds` from `orderRefs` and leaves channel null unless extras
   provide one.
2. Empty `orderRefs` cannot prove overlap. `checkId` is not a fallback. A
   later Cashier producer that writes production facts against SRs missing
   order refs would still double-count. That is a **writer/snapshot**
   dependency, not a Union heuristic.
3. Cashier Confirm still has no `paymentIntentId` and is not connected.
4. Production `payment_collection_facts` row count must remain 0 until a
   separate certified producer exists.
5. Refund / void / complimentary Collection Fact kinds still do not exist.

---

## Pass criteria

1–12, 17–19, 22: met by implementation + tests + docs.
13–16: no Cashier/Confirm/production-write/0098 changes.
20–21: working tree is **not** committed by this program unless explicitly
requested; `git diff --cached --check` is a pre-commit gate, not a deploy
gate.

**Do not treat this PASS as Cashier adoption or live Collection Fact revenue.**
