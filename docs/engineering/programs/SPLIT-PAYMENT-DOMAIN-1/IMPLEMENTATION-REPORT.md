# SPLIT-PAYMENT-DOMAIN-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Pure Domain (no persistence) |
| **ADR** | [ADR-ARCH-024](../../../architecture/adrs/ADR-ARCH-024-split-payment-platform.md) |
| **Also compatible** | ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 |

---

## Delivered

Pure Split Payment domain under:

`shared/operational-session/check/splitPayment/`

| Module | Responsibility |
|--------|----------------|
| `splitPaymentContract.ts` | Entities, statuses, identity VOs, Completion types |
| `splitPaymentIdentity.ts` | Payment Identity Governance (stable opaque ids) |
| `splitPaymentMoney.ts` | Outstanding / allocation / conservation math |
| `splitPaymentLifecycle.ts` | Allow-list transitions + terminal protection |
| `splitPaymentInvariants.ts` | I-SP-01…08, Finality, identity stability |
| `splitPaymentCommands.ts` | create / authorize / capture / allocate / cancel / void / refund / attempts |
| `splitPaymentEvents.ts` | Event **contracts** only (no bus) |
| `splitPaymentErrors.ts` | Canonical domain errors |
| `index.ts` | Barrel |

Exported from `shared/operational-session/check` and `shared/operational-session`.

---

## Design notes

- **Not** an Aggregate Root — Check-owned FSP capability. Tender is **not** an Aggregate Root.
- Commands return `{ outcome: "applied" \| "already_applied" \| "no_change", payment, events }` for ADR-021 idempotent integration without Domain redesign.
- **Payment Finality (I-SP-06):** `impliesFinancialSettlement` is always `false`; `PaymentCompleted` never settles a Check.
- **Identity governance:** `PaymentId`, `PaymentAttemptId`, `TenderAllocationId`, `PaymentReference`, `FinancialReference` are stable across auth/capture/allocate/complete/refund/void; independent of persistence/transport ids.
- Allocation dimension statuses: `partially_applied` / `applied` (DOMAIN-1 refinement of ADR-024 conceptual `partially_settled` / `settled` at Payment level).
- No schema, repository, API, projection, integration, or UI.

---

## Tests

- Money, lifecycle, invariants, commands unit suites
- Architecture guards (no infra imports; statuses; terminal protection; ADR-021 outcomes; event contracts; Finality)

---

## Ready for

**SPLIT-PAYMENT-PERSISTENCE-1** — persistence may map `SplitPayment` / attempts / allocations without changing Domain contracts, lifecycle rules, Finality law, or identity semantics.
