# ORDER-SETTLEMENT-INTEGRATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-22 |
| **Type** | Integration (Check Aggregate orchestration) |
| **ADR** | ADR-ARCH-022 · ADR-ARCH-020 · ADR-ARCH-021 |
| **Prior** | ORDER-SETTLEMENT-DOMAIN-1 · ORDER-SETTLEMENT-PERSISTENCE-1 · MIGRATION-EXECUTION-1 |

---

## Objective

Connect the certified Order Settlement Domain and Repository to the Financial Settlement Platform so the **Check Aggregate** is the only mutation authority.

---

## Delivered

| Artifact | Path |
|----------|------|
| Check Aggregate OS orchestration | `server/operational-session/check/checkOrderSettlementIntegration.ts` |
| Check Aggregate wiring + tx ownership | `server/operational-session/check/CheckService.ts` |
| Membership lifecycle OS ensure | `server/operational-session/check/checkMembershipService.ts` |
| Barrel exports | `server/operational-session/check/index.ts` |
| Integration tests | `server/operational-session/check/__tests__/checkOrderSettlementIntegration.test.ts` |
| Aggregate consistency / rollback tests | `server/operational-session/check/__tests__/CheckService.orderSettlementIntegration.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/orderSettlementIntegration.architecture.guards.test.ts` |

---

## Command flow (enforced)

```
Application
  → Check Aggregate (CheckService)
    → Order Settlement Domain commands
      → Order Settlement Repository
        → Persistence (check_order_settlements)
```

No API / Controller / UI / Repository bypass of Aggregate commands.

---

## Integration points

| Platform concern | Aggregate path |
|------------------|----------------|
| Check lifecycle (create / ensure / recalc) | enroll → `ensureOrderSettlementForEnrollment` → money refresh → `recalculateOrderSettlementsForCheck` |
| Settlement workflow (paid / complimentary / void) | `finalizeOpenCheckById` → tenders → OS apply* → (void) membership deactivate |
| Membership lifecycle | `enrollOrderForSessionCheck` / `syncSessionOrdersToCheck` call Aggregate OS ensure after enroll |
| Settlement Transactions | inserted in the same Check-owned transaction as OS mutations |
| Cancel / Partial / Refund | Aggregate commands: `cancelOrderSettlementOnCheck`, `applyPartialOrderSettlementOnCheck`, `refundOrderSettlementsOnCheck` |

---

## Transaction / failure atomicity

- `withCheckOwnedTransaction` owns the unit of work (`db.transaction` when no outer client).
- Repositories accept optional `SessionDbClient` and **do not** commit independently.
- On paid / complimentary / void finalize, **Check outcome + Settlement Transactions + Order Settlement + Membership void** share one transaction.
- `deactivateMembershipsOnCheckVoid` **rethrows** so void failures roll back the full financial operation.
- Partial financial consistency is not permitted.

---

## Domain events

- Existing Domain event contracts are collected and exposed via `CheckFinancialMutationResult` / `*Detailed` settle APIs.
- **Not** implemented: Event Bus, Outbox, Inbox, Broker, publishing.

---

## Idempotency (ADR-ARCH-021)

- Domain outcomes `applied` | `already_in_state` respected.
- Enrollment: existing identity → no insert; duplicate key race → reload as `already_in_state`.
- Terminal re-apply (e.g. settle when already settled) → no repository update.

---

## Out of scope (confirmed)

No Domain redesign · No Persistence schema changes · No projections · No UI · No Event Bus / Outbox / Inbox · No API redesign.

---

## Ready for

**ORDER-SETTLEMENT-PROJECTION-1** — may consume collected Domain events / OS reads without further Aggregate redesign.
