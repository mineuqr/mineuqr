# CRITICAL-PATH-BEFORE-AFTER

## BEFORE (observed)

```
CONFIRM
  → Payment Commit
  → Collection Fact
  → Check PAID
  → ST
  → OS
  → SR
  → TX COMMIT
  → HTTP SUCCESS
```

## AFTER (runtime)

```
CONFIRM
  → PAYMENT COMMIT
  → freeze (Check charges/snapshots)
  → IMMUTABLE COLLECTION FACT (created | replayed)
  → COMMITTED / PAID
  → freeze TX COMMIT (OPEN Check + durable checkId)
  → HTTP SUCCESS
        ↓
      Check PAID + ST + OS + SR  (not awaited)
        ↓
      REPORTING (read-time Union)
```

HTTP **awaits**: auth, identities, CRMP register/shift, Check materialize/freeze, CF commit/replay.

HTTP **does not await**: `insertSettlementTransactions`, `applyFullSettlementToCheckOrders`, `createSettlementRecordForCheckFinalize`, Check PAID `finalizeCheckOutcome`, CRMP Attribution.

POS HTTP no longer throws `check_not_eligible` when Check is still OPEN after CF. `resultFrom.outcome` remains `"paid"`. Settlement Record id may be null; Cashier UI already rediscovers.
