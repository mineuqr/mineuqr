# TEST RESULTS

**Date:** 2026-08-16  
**Production mutation:** 0  
**Migration applied:** none  

## Targeted

| Suite | Result |
|-------|--------|
| POS architecture guards (replace occupancy) | PASS |
| POS terminal domain (replace + already_replaced) | PASS |
| Commercial occupancy unlocked (`occupancyDelta: 0`) | PASS |
| Commercial occupancy architecture guards | PASS |

Conversation record: **4 files / 22 tests** on the targeted subset before full regression.

## Real database concurrency

`commercialLimitOccupancy.concurrency.test.ts`: **15 passed** (10 predecessor + 5 provisioned-replace).

Engine: isolated Docker MySQL **8.0** (`mineuqr-occupancy-test`, port 3307).  
**Not** Production TiDB.

## Build

`pnpm run build` — **PASS**

## Check

`pnpm run check` — **188** `error TS*` — matches COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1 baseline. No new TypeScript errors attributed to this program.

## Combined regression

Same file set as predecessor occupancy implementation, plus tests added in existing files:

| Metric | Predecessor occupancy | This program |
|--------|----------------------:|-------------:|
| Test files | 56 | 56 |
| Tests | 377 | **385** |
| Failed | 0 | **0** |
| Delta | | **+8** |

+8 breakdown: domain +1, occupancy unit +1, POS architecture guards +1, concurrency +5.

Command: `pnpm exec vitest run` over POS, subscription-runtime occupancy, plan limits, commercial gating/limits, shared/pos, IdentityPlaceOrder, SettleOrderPaid, StaffCounterPickup, CRMP, Check settlement, reporting parity.

**Exit 0.** No unrelated tests were modified to pass.

## Pre-existing failures

None in this suite. Check 188 is the known baseline, not a new occupancy failure.

## Idempotency

No provisioned-replace idempotency **key** table exists. Sequential/concurrent repeat is `already_replaced`. Not redesigned.
