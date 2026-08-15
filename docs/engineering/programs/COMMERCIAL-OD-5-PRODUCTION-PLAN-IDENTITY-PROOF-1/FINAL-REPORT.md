# COMMERCIAL-OD-5-PRODUCTION-PLAN-IDENTITY-PROOF-1 — FINAL REPORT

Date: 2026-08-15  
Queried: 2026-08-15T11:39:27.932Z production TiDB / `mineuqr`

## A. STATUS

**OD-5 — PRODUCTION PLAN IDENTITY PROOF PASSED**

## B. CURRENT PRODUCTION POPULATION

7 `user_subscriptions` rows. Status: active 5, expired 2, trial 0, canceled 0.  
Paid invoices: 0. Stripe subscription ids: 0.

## C. DISTINCT PLAN IDS

30001 (1), 30002 (4), 30003 (2). No others.

## D. MAPPING

| Integer | Code | UUID |
|--------:|------|------|
| 30001 | basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` |
| 30002 | professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` |
| 30003 | enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` |

## E. BINDING CROSS-CHECK

2 bindings. 30001 and 30003 UUIDs agree 100%. No 30002 binding.

## F. UNBOUND SUBSCRIPTIONS

5 unbound (30002 ×4, 30003 ×1). All resolvable. No binds created.

## G. UNKNOWN / ANOMALOUS IDS

None. No 1, 102, 0, NULL, negative.

## H. REAL CUSTOMER / PAID DATA

0 paid invoices. 2 INTERNAL admin rows. 5 COMMERCIAL + local openId prefix (test/dev pattern). No special customer-contract migration.

## I. PROOF MATRIX

All P-OD5-01…11 **PASS**.

## J–O

| Area | State |
|------|-------|
| Data mutation | **NONE** |
| Schema | **UNCHANGED** |
| API | **UNCHANGED** |
| Checkout | **UNCHANGED** |
| MRR | **UNCHANGED** |
| Charged Terms | **UNCHANGED** |

## P. OD-2 GATE

**MAY PROCEED** to architecture / implementation design.  
**MUST NOT** be executed from this program.

## Q. ADR IMPACT

034 / 035 / 036: no amendment.

## R. GIT

See operator return. This program adds only this directory (docs + read-only query script + evidence JSON). No commit. No push. No deploy.

## STOP

Do not start OD-2 implementation from this program.
