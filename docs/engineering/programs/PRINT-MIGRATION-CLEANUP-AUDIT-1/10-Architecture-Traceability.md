# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Architecture Traceability

**Date:** 2026-06-26

---

## Constitution → Implementation Traceability

| Constitution rule | Printing evidence | Status |
|-------------------|-------------------|--------|
| Order is the only Core Domain | No print tables on order; consumer only reacts to events | ✓ |
| Printing is a Service | `OrderPrintingConsumer` in infrastructure, not domain | ✓ |
| Sessions outside Core Domain | No print-session coupling | ✓ |
| Event-Driven Architecture | `OrderCreated` / `OrderReady` subscription | ✓ |
| Transactional Outbox | Events via `DrizzleOutboxRepository` | ✓ |
| Publisher transport-only | `InProcessEventPublisher` — no print logic | ✓ |
| Consumer Registry owns dispatch | `OrderEventConsumerRegistry` | ✓ |
| One Production Path | Single consumer → port (no-op) | ✓ |
| Single Source of Truth = Order Aggregate | No print-owned order state | ✓ |

---

## ADR Traceability

| ADR | Requirement | Implementation |
|-----|-------------|----------------|
| ADR-ARCH-012 | Print via events + read models only | `OrderPrintingConsumer` + future P-08 |
| ADR-ARCH-004 | Event-driven integration | Consumer registry pattern |
| ADR-ARCH-005 | Outbox delivery | `OrderEventRelay` |
| ADR-ARCH-001 | Order sovereignty | No printer IDs on aggregate |

---

## Program Traceability Chain

```
RESET-1 (retirement)
    └── ORDER-EVENTS-1B (consumer foundation)
            └── READ-ARCHITECTURE-1 (P-08 design)
                    └── ORDERS-READ-MODEL-1 (order read foundation)
                            └── PRINT-MIGRATION-CLEANUP-AUDIT-1 (this audit)
                                    └── PRINTING-1 (next)
                                            ├── PRINT-WORKSPACE-1
                                            └── PRINT-CONNECTOR-1
```

---

## RESET-1 Wave → Artifact Mapping

| Wave | Removed | Verified absent |
|------|---------|-----------------|
| 1 | Client UI, `docs/thermal-printing/` | ✓ |
| 2 | API routers, auto-print hooks | ✓ |
| 3 | `server/printing/`, `print-host/`, `agent/` | ✓ |
| 4 | `shared/printing/` | ✓ |
| 5 | DB tables via 0043 | ✓ |
| 6 | Feature keys, deps, ops | ✓ |

---

## READ-ARCHITECTURE-1 → Code Mapping

| Design artifact | Code status |
|-----------------|-------------|
| P-08 Printing Queue | Metadata in `ProjectionLifecycleRegistry` — `defined` |
| `PrintingQueueProjectionConsumer` | Type only — not in `createOrderReadProjectionConsumers` |
| `server/printing/read/` | Directory does not exist |
| Q-30 `printing.read.getQueue` | Not in `server/routers.ts` |
| RA-06 consumer/port split | Matches `OrderPrintingConsumer` + future P-08 |

---

## ORDER-EVENTS-1B Certification → Current State

| Certified deliverable | Present |
|-----------------------|---------|
| `OrderPrintingConsumer` | ✓ |
| `OrderKitchenConsumer` | ✓ |
| Port injection pattern | ✓ `LogOrderPrintDispatchPort` |
| Registry ordering (40) | ✓ |
| Consumer independence | ✓ No cross-consumer calls |
| Tests | ✓ |

---

## Boundary Verification Summary

| Boundary rule | Verdict |
|---------------|---------|
| Printing contains no business rules | **PASS** — stub only logs |
| Printing never owns Order state | **PASS** |
| Printing never bypasses Events | **PASS** |
| Printing never authoritative over Orders | **PASS** |
| Printing not inline in Order commit | **PASS** |

---

## Audit Deliverable Index

| # | Report |
|---|--------|
| 01 | Printing Architecture Inventory |
| 02 | Production Path Audit |
| 03 | Legacy Code Audit |
| 04 | Database Audit |
| 05 | Migration Audit |
| 06 | Runtime Ownership |
| 07 | Documentation Audit |
| 08 | Dependency Analysis |
| 09 | Cleanup Recommendations |
| 10 | Architecture Traceability (this document) |
| 11 | Final Audit Summary |

---

## Exit Criteria Mapping

| Criterion | Met |
|-----------|-----|
| Entire printing platform inventoried | ✓ |
| Production path documented | ✓ |
| Legacy components identified | ✓ |
| Runtime ownership documented | ✓ |
| Database ownership verified | ✓ |
| Migration health verified | ✓ |
| Documentation drift identified | ✓ |
| Cleanup recommendations produced | ✓ |
| No production behavior changed | ✓ |
| No architecture rules violated | ✓ |
