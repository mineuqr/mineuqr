# SETTLEMENT-ATTRIBUTION-ADOPTION-1 — Phase 1 Adoption Audit

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-ATTRIBUTION-ADOPTION-1 |
| **Date** | 2026-07-24 |
| **Mode** | Audit only (pre-code) |

## Pipeline (certified)

```
settle wrappers
  → resolve SettlementContext (fail-open)
  → Check-owned TX:
       finalizeCheckOutcome
       insertSettlementTransactions
       Order Settlement apply*
       createSettlementRecordForCheckFinalize
  → [INSERTION POINT] post-commit attribution attempt
  → return CheckFinancialMutationResult
```

## Canonical insertion point

**After** the Check-owned financial TX commits successfully, still inside `finalizeOpenCheckById` completion sequence.

### Why not inside the Check TX?

| Constraint | Implication |
|------------|-------------|
| ADR-ARCH-030 fail-open | Attribution failure MUST NOT roll back money / SR |
| CRMP vs Check ownership | Attribution mutates Financial Shift AR; Check TX must not own CRMP writes |
| Existing CRMP UoW | Separate persistence adapter; not the Check `tx` client |

Post-commit attempt preserves atomic money+SR, then best-effort attribution with explicit status.

## Preconditions for attempt

- Outcome ∈ `{ paid, complimentary }` (terminal settle with SR)
- `settlementRecord.record` present
- Settlement Context has `registerId` + `financialShiftId` + `operatorUserId` (no fabricate)
- Shift must be `open` for domain attribution (existing D-INV)

Otherwise: `skipped` with gaps — settle already succeeded.

## Idempotency

Existing CRMP `createSettlementAttribution` unique by `settlementRecordId` (D-INV-13 / DB unique).
