# ORDER-SETTLEMENT-DOMAIN-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-22 |
| **Type** | Pure Domain (no persistence) |
| **ADR** | [ADR-ARCH-022](../../../architecture/adrs/ADR-ARCH-022-order-settlement-platform.md) (rev 1.1) |
| **Also compatible** | ADR-ARCH-020 · ADR-ARCH-021 |

---

## Delivered

Pure Order Settlement domain under:

`shared/operational-session/check/orderSettlement/`

| Module | Responsibility |
|--------|----------------|
| `orderSettlementContract.ts` | Entity, statuses, identity VOs |
| `orderSettlementMoney.ts` | Outstanding / coverage / allocation math |
| `orderSettlementLifecycle.ts` | Allow-list transitions + I-OS-14 |
| `orderSettlementInvariants.ts` | I-OS-01…12, I-OS-14 enforcement |
| `orderSettlementCommands.ts` | create / recalculate / settle / cancel / void / refund |
| `orderSettlementEvents.ts` | Event **contracts** only (no bus) |
| `orderSettlementErrors.ts` | Canonical domain errors |
| `index.ts` | Barrel |

Exported from `shared/operational-session/check` and `shared/operational-session`.

---

## Design notes

- **Not** an Aggregate Root — Check-owned Entity.
- Commands return `{ outcome: "applied" \| "already_in_state", settlement, events }` for ADR-021 idempotent integration without Domain redesign.
- Terminal cancelled / voided / refunded zero `settledAmount` + `outstandingAmount` (I-OS-03 terminal note).
- No schema, repository, API, projection, or UI.

---

## Tests

- Money, lifecycle, invariants, commands unit suites
- Architecture guards (no infra imports; statuses; I-OS-14; ADR-021 outcomes)

---

## Ready for

**ORDER-SETTLEMENT-PERSISTENCE-1** — persistence may map `OrderSettlement` without changing Domain contracts or lifecycle rules.
