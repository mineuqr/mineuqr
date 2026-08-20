# ARCHITECTURE-DECISION-REPORT

Program: **CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1**

Does not redesign Collection Fact, Check, ST, OS, SR, or Revenue Union. Does not undo CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1.

## Durable obligation without 0098

The obligation is **derived** from rows that already exist after HTTP success:

1. Production Collection Fact (`cashier_pos`, `purpose=production`, `checkId` set)
2. OPEN Check with freeze, **or** PAID Check missing settlement SR

HTTP cannot return until the Check freeze TX commits, and that TX awaits Collection Fact create/replay. Therefore:

Collection Fact COMMITTED ∧ HTTP SUCCESS ⇒ durable CF row + durable Check row.

A new recovery table would be a second identity and would require 0098. Existing facts are sufficient.

## Execution

- Fast path: existing `void completeCashierOperationalSettlementAfterCollectionFact` after HTTP (not awaited)
- Crash path: database sweep on boot + 15s interval
- Replay path: POS idempotency replay schedules recovery without awaiting HTTP

## Partial completion

OPEN + no ST: certified atomic `finalizeOpenCheckById` (PAID+ST+OS+SR). Crash mid-TX rolls back; retry is full finalize.

PAID: `ensureRemainingCashierDownstreamSettlement` skips completed ST / settled OS / existing SR.
