# REFUND-DOMAIN-IMPLEMENTATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REFUND-DOMAIN-IMPLEMENTATION-1 |
| **Phase** | Production Implementation |
| **Mode** | Constitutional Implementation |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-032 · ADR-ARCH-020 · 021 · 022 · 023 · 026 · 028 · 030 · 031 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Refund Domain is implemented as a **Check-owned Financial Settlement Platform capability** under ADR-ARCH-032.

- Pure domain module: commands, budget law, invariants, events, idempotency  
- Check Aggregate orchestration: single TX for budget apply + Order Settlement transition + compensating Settlement Record  
- No UI, Reporting, Register attribution, receipts, or payment gateways  

---

## 2. Implemented Domain Commands

| Command | Module | Responsibility |
|---------|--------|----------------|
| `requestRefund` | `refundCommands.ts` | Capture Refund intent |
| `validateRefund` | `refundCommands.ts` | Enforce Refund Budget Law |
| `applyRefund` | `refundCommands.ts` | Apply reverse value + allocations |
| `calculateRefundBudget` | `refundBudget.ts` | Derive budget from immutable SR history |
| `publishCompensatingSettlementRecord` | `refundCommands.ts` | Append `recordKind=refund` SR |
| `completeRefund` | `refundCommands.ts` | Terminal Refund fact |
| `executeRefundOnCheck` | `refundCommands.ts` | Atomic domain composition |
| `applyRefundOnCheck` | `checkRefundIntegration.ts` / `CheckService` | Check Aggregate TX façade |

---

## 3. Implemented Domain Events

| Event | Publisher |
|-------|-----------|
| `RefundRequested` | Refund Platform / Check |
| `RefundValidated` | Refund Platform / Check |
| `RefundApplied` | Refund Platform / Check |
| `RefundAllocationCreated` | Refund Platform / Check |
| `RefundSettlementRecordPublished` | Refund Platform / Check |
| `SettlementRecordCreated` (refund gen) | Check Aggregate |
| `SettlementRecordRefunded` | Check Aggregate |
| `OrderSettlementRefunded` | Check / Order Settlement |
| `RefundCompleted` | Refund Platform / Check |

Events are **collected**, not bus-published (ADR-021 compatible; same pattern as Settlement Record / Split Payment).

---

## 4. Implemented Invariants

| ID | Enforced |
|----|----------|
| RF-BUDGET-01…05 | `refundBudget.ts` / `assertRefundWithinBudget` |
| RF-INV-F01…F05 | money + allocation asserts |
| RF-INV-L01…L05 | prior settlement + Check outcome + no reopen |
| RF-INV-P01…P05 | compensating SR + prior link |
| RF-INV-G01…G04 | monotonic generation |
| RF-INV-I01…I04 | `applied` \| `already_applied` + claim keys |
| RF-INV-T01…T03 | Check TX composition |
| RF-INV-TEN01…03 | tenant asserts |
| I-OS-14 | `refundOrderSettlement` only; no pending reopen |
| SR-INV-02 | append-only compensating publish |

---

## 5. Transaction Flow

```
CheckService.applyRefundOnCheck
  └── withCheckOwnedTransaction
        └── checkRefundIntegration.applyRefundOnCheck
              ├── load Check + Settlement Records + Order Settlements
              ├── executeRefundOnCheck (pure domain)
              │     ├── calculateRefundBudget
              │     ├── request → validate → apply
              │     ├── OS → refunded (when budget exhausted / targeted)
              │     ├── createCompensatingSettlementRecord (refund)
              │     └── completeRefund
              ├── updateOrderSettlement (applied transitions)
              └── insertSettlementRecord (append-only)
```

Rollback: any failure before commit rolls back the Check-owned transaction.

---

## 6. Test Results

```
npx vitest run shared/operational-session/check/refund \
  shared/operational-session/__tests__/refundDomain.architecture.guards.test.ts \
  server/operational-session/check/__tests__/checkRefundIntegration.test.ts

Test Files  3 passed (3)
Tests       25 passed (25)
```

Coverage includes:

| Scenario | Result |
|----------|--------|
| Full Refund | Pass |
| Partial Refund | Pass |
| Multiple Refunds | Pass |
| Duplicate Refund | Pass |
| Budget exceeded | Pass |
| Already Refunded | Pass |
| Settlement Record immutability | Pass |
| Retry idempotency | Pass |
| Concurrent generation (already_applied) | Pass |
| Tenant isolation | Pass |
| Architecture guards | Pass |
| Check Aggregate integration | Pass |

---

## 7. Files Changed

### Domain (shared)

- `shared/operational-session/check/refund/` (new module)
  - `refundContract.ts`, `refundErrors.ts`, `refundMoney.ts`, `refundIdentity.ts`
  - `refundLifecycle.ts`, `refundInvariants.ts`, `refundBudget.ts`
  - `refundEvents.ts`, `refundCommands.ts`, `index.ts`
  - `__tests__/refundCommands.test.ts`
- `shared/operational-session/check/index.ts` — export Refund
- `shared/operational-session/index.ts` — export Refund
- `shared/operational-session/check/settlementRecord/settlementRecordEvents.ts` — `buildSettlementRecordRefundedEvent`
- `shared/operational-session/check/settlementRecord/index.ts`
- `shared/operational-session/__tests__/refundDomain.architecture.guards.test.ts`

### Check Aggregate (server)

- `server/operational-session/check/checkRefundIntegration.ts` (new)
- `server/operational-session/check/CheckService.ts` — `applyRefundOnCheck`, `getCheckRefundBudget`
- `server/operational-session/check/index.ts`
- `server/operational-session/check/__tests__/checkRefundIntegration.test.ts`

### Governance docs

- `docs/architecture/adrs/ADR-ARCH-032-refund-platform.md` — implementation status
- `docs/architecture/constitution/ADR-Registry.md` — status update
- `docs/engineering/programs/REFUND-DOMAIN-IMPLEMENTATION-1/*` — this report set

---

## 8. Architectural Deviations

**NONE.**

No new Aggregate Roots. No Settlement Record mutation. No Order/Session/Register money ownership. No UI/Reporting/Register workflows.

---

## 9. Out of Scope (successor programs)

- Settlement Ledger UI / Presentation  
- Register Attribution / cash drawer  
- Reporting Net Revenue adoption  
- External payment gateway reverse  
- Product workflow UX  

---

## 10. Final Certification

**PRODUCTION CERTIFIED**
