# ADR-POS-RS-01: Consume CRMP Settlement Context

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-REGISTER-SHIFT-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

POS Register/Shift wiring reuses CRMP `resolveSettlementContextForSettle`. POS settlement initiation requires a resolved Register + active Financial Shift, then calls existing `settleCheckPaidByIdDetailed` with `settlementContextHints`.

POS does not own Register/Shift. Check remains fail-open if called without hints; POS refuses to call without resolved context.

## Rejected

| Alternative | Why |
|-------------|-----|
| New POS Register/Shift tables | Second domain — STOP |
| `StaffCounterPickupSettlementService` | Wrong authorization contract |
| POS open/close Register APIs | Duplicates CRMP; weakens or forks authorization |
| Require Register for Sale/Intake | Invents a rule those commands never had |
| New migration | Existing CRMP tables suffice |
