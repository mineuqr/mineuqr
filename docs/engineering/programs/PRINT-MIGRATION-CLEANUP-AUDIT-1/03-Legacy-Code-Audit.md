# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Legacy Code Audit

**Date:** 2026-06-26

Classification key: **ACTIVE** | **DEPRECATED** | **DEAD CODE** | **REMOVE CANDIDATE**

---

## Active Runtime (Keep)

| Artifact | Path | Role | Classification |
|----------|------|------|----------------|
| `OrderPrintingConsumer` | `server/order/.../OrderPrintingConsumer.ts` | Event hook for future PRINTING-1 | **ACTIVE** |
| `OrderPrintDispatchPort` | `server/order/.../ports/OrderPrintDispatchPort.ts` | Port contract | **ACTIVE** |
| `LogOrderPrintDispatchPort` | same | No-op default wiring | **ACTIVE** |
| `OrderKitchenConsumer` | `server/order/.../OrderKitchenConsumer.ts` | Kitchen telemetry stub | **ACTIVE** |
| Consumer registration | `server/order/consumerComposition.ts` | Wires printing at order 40 | **ACTIVE** |
| Ops events | `server/_core/opsTaxonomy.ts` | Print/kitchen telemetry types | **ACTIVE** |
| Consumer tests | `__tests__/OrderPrintingConsumer.test.ts` etc. | Certification coverage | **ACTIVE** |

---

## Active Metadata (Keep — Future Programs)

| Artifact | Path | Classification |
|----------|------|----------------|
| P-08 projection definition | `ProjectionLifecycleRegistry.ts` | **ACTIVE** (defined, not materializing) |
| P-07 kitchen projection definition | same | **ACTIVE** |
| `PrintingQueueProjectionConsumer` type | `OrderProjectionConsumer.ts` | **ACTIVE** (type only) |
| `server/printing/read` owner reference | `projectionContracts.ts` | **ACTIVE** (planned module path) |

---

## Removed — No Longer in Repository (DEAD CODE)

| Former artifact | Former location | RESET wave |
|-----------------|-----------------|------------|
| `shared/printing/` domain types | shared | Wave 4 |
| `server/printing/` service layer | server | Waves 3–4 |
| `server/print-host/` dispatcher | server | Wave 3 |
| `agent/` ESC/POS executor | repo root | Wave 3 |
| Print tRPC routers | server routers | Wave 2 |
| Auto-print client hooks | client | Wave 2 |
| Print workspace UI | client | Wave 1 |
| `docs/thermal-printing/` | docs | Wave 1 |
| `scripts/preflight-printing-integrity-audit.ts` | scripts | Removed (exact wave undocumented) |

**Grep verification:** Zero runtime references to `PrintHost`, `PrintAgent`, `TicketDocument`, `escpos`, `server/printing/`, `print-host/`, `agent/`.

---

## Deprecated — Historical References Only

| Artifact | Location | Notes | Classification |
|----------|----------|-------|----------------|
| Commercial audit print rows | `docs/commercial-audit/PG-1C.*.md` | Stale `thermalPrinting` / `autoPrint` / `reprint` rows; some have RESET-1 staleness notes | **DEPRECATED** (doc snapshots) |
| THERMAL-PRINTING program comments | `drizzle/0031`–`0042` SQL headers | Historical program IDs in migration comments | **DEPRECATED** (journal history) |
| `DATA-INTEGRITY-1` print script references | `docs/commercial-audit/` | References removed audit script behavior | **DEPRECATED** |

---

## Dead Code — References Without Implementation

| Reference | Where | Classification |
|-----------|-------|----------------|
| `PrintingQueueProjectionConsumer` class | Not in codebase — type/name only | **DEAD CODE** (planned) |
| `KitchenQueueProjectionConsumer` class | Not in codebase | **DEAD CODE** (planned) |
| `server/printing/read/` module | Referenced in registry, directory absent | **DEAD CODE** (planned path) |
| `server/kitchen/read/` module | Same | **DEAD CODE** (planned path) |
| `scripts/preflight-printing-integrity-audit.ts` | Cited in 0038–0042 comments | **DEAD CODE** (script removed) |
| Q-30 / Q-31 tRPC procedures | RA-03 docs only | **DEAD CODE** (planned API) |

---

## Remove Candidates (Audit Recommendations — Do Not Auto-Delete)

| Candidate | Rationale | Recommended action |
|-----------|-----------|-------------------|
| Stale commercial audit rows (no staleness note) | Misleading if read as current | **Needs Verification** — add RESET-1 banner or archive |
| Migration comments referencing deleted preflight script | Orphan doc reference | **Keep** — journal immutability; optional comment cleanup in future doc-only pass |
| `LogOrderPrintDispatchPort` no-op default | Intentional until PRINTING-1 | **Keep** — replace with real port in PRINTING-1, not remove now |

**No runtime REMOVE CANDIDATES identified.** RESET-1 already performed substantive removal.

---

## Unused APIs / Routes / Services

| Surface | Finding |
|---------|---------|
| tRPC print procedures | **None exist** |
| HTTP print routes | **None exist** |
| Print service classes | **None exist** |
| Print workers | **None exist** |
| Deprecated adapters | **None in runtime** |
| Deprecated renderers | **None in runtime** |
| Deprecated queues (runtime) | **None** — DB queue dropped |

---

## Legacy Footprint Summary

| Layer | Legacy in runtime | Legacy in migrations | Legacy in docs |
|-------|-------------------|----------------------|----------------|
| Code | **Minimal** (2 consumers + 1 port) | 14 SQL files | Moderate (commercial audits) |
| Estimated LOC (print-specific active) | ~120 lines | ~400 lines SQL (historical) | — |

---

## Verdict

RESET-1 achieved a **clean runtime baseline**. Remaining "legacy" is almost entirely **historical migrations** and **documentation snapshots**, not executable dead code in the application tree.
