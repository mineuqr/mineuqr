# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Printing Architecture Inventory

**Program:** PRINT-MIGRATION-CLEANUP-AUDIT-1  
**Type:** Architecture Audit (read-only)  
**Date:** 2026-06-26  
**Authority:** Architecture Constitution v1.0, ADR-ARCH-012, RESET-1-CLOSURE

---

## Executive Context

Thermal printing was **fully retired** under RESET-1 (Waves 1–6). The current codebase retains only an **event-consumer foundation** and **read-architecture metadata** for future programs (PRINTING-1, PRINT-WORKSPACE-1, PRINT-CONNECTOR-1). No print runtime, APIs, DB tables, or client UI exist today.

---

## 1. Runtime Components (Active)

| Component | Path | Purpose | Classification |
|-----------|------|---------|----------------|
| `OrderPrintingConsumer` | `server/order/infrastructure/events/consumers/OrderPrintingConsumer.ts` | Subscribes to `OrderCreated`, `OrderReady`; invokes print dispatch port; emits ops telemetry | **ACTIVE** (foundation stub) |
| `OrderPrintDispatchPort` | `server/order/infrastructure/events/consumers/ports/OrderPrintDispatchPort.ts` | Port interface + `OrderPrintDispatchRequest` type | **ACTIVE** |
| `LogOrderPrintDispatchPort` | same file | Default no-op implementation (silent logger) | **ACTIVE** (placeholder) |
| `OrderKitchenConsumer` | `server/order/infrastructure/events/consumers/OrderKitchenConsumer.ts` | Kitchen integration telemetry only (not KDS) | **ACTIVE** (related boundary) |
| Consumer wiring | `server/order/consumerComposition.ts` | Registers printing consumer (order 40) with `LogOrderPrintDispatchPort` | **ACTIVE** |
| Event infrastructure | `server/order/eventInfrastructureComposition.ts` | Outbox → relay → publisher → consumer registry | **ACTIVE** |
| Ops taxonomy | `server/_core/opsTaxonomy.ts` | `order_print_dispatch_requested`, `order_kitchen_event_received` | **ACTIVE** |

### Tests (Active)

| File | Coverage |
|------|----------|
| `server/order/infrastructure/events/consumers/__tests__/OrderPrintingConsumer.test.ts` | Port dispatch on `OrderCreated` |
| `server/order/infrastructure/events/consumers/__tests__/OrderKitchenConsumer.test.ts` | Telemetry only |
| `server/order/infrastructure/events/__tests__/OrderEventConsumerRegistry.test.ts` | Registry includes printing consumer |

---

## 2. Read-Model Metadata (Defined, Not Implemented)

| Artifact | Path | Purpose | Classification |
|----------|------|---------|----------------|
| P-08 Printing Queue | `server/order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts` | Projection catalog entry; `lifecycleState: "defined"` | **ACTIVE metadata** |
| P-07 Kitchen Queue | same file | Kitchen counterpart | **ACTIVE metadata** |
| Projection IDs | `server/order/read/domain/contracts/projectionIds.ts` | `P-08-printing-queue` | **ACTIVE metadata** |
| Owner modules | `server/order/read/domain/contracts/projectionContracts.ts` | `server/printing/read` (module does not exist) | **ACTIVE metadata** |
| Consumer name type | `server/order/read/projections/consumers/contracts/OrderProjectionConsumer.ts` | `PrintingQueueProjectionConsumer` type only | **ACTIVE metadata** |

**Not present in code:** `PrintingQueueProjectionConsumer`, `KitchenQueueProjectionConsumer`, `server/printing/read/`, `server/kitchen/read/`.

`createOrderReadProjectionConsumers.ts` registers P-01–P-06, P-10, P-11 only — **no print projection consumers**.

---

## 3. Retired Components (RESET-1 — Removed from Repository)

| Former component | Former path | Wave | Classification |
|------------------|-------------|------|----------------|
| Thermal printing domain | `shared/printing/` | 4 | **REMOVED** |
| Print service / queue / dispatch | `server/printing/` | 3–4 | **REMOVED** |
| Print Host dispatcher | `server/print-host/` | 3 | **REMOVED** |
| Edge Print Agent (ESC/POS) | `agent/` | 3 | **REMOVED** |
| Print tRPC routers / HTTP APIs | server routers | 2 | **REMOVED** |
| Auto-print hooks | client + server | 2 | **REMOVED** |
| Print Host dispatch client | server | 2 | **REMOVED** |
| Client print workspace UI | client | 1 | **REMOVED** |
| Thermal printing docs | `docs/thermal-printing/` | 1 | **REMOVED** |
| Commercial feature keys | `thermalPrinting`, `autoPrint`, `reprint` | 6 | **REMOVED** from `featureKeys.ts` |
| Preflight audit script | `scripts/preflight-printing-integrity-audit.ts` | — | **REMOVED** (referenced only in migration comments) |

---

## 4. APIs and Routes

| Surface | Status |
|---------|--------|
| tRPC `appRouter` (`server/routers.ts`) | **No print procedures** |
| Express API (`server/_core/createApiApp.ts`) | **No print HTTP routes** |
| Planned Q-30 `printing.read.getQueue` | Docs only — READ-ARCHITECTURE-1 RA-03 |
| Planned Q-31 `printing.read.getConnectorStatus` | Docs only — PRINT-CONNECTOR-1 |

---

## 5. Rendering / ESC/POS / TicketDocument

| Capability | Runtime code | Classification |
|------------|--------------|----------------|
| TicketDocument renderer | **None** | **REMOVED** (never referenced in current repo) |
| ESC/POS encoder | **None** | **REMOVED** |
| Print profiles / paper width | **None** (was DB `printers` table) | **REMOVED** |
| Cairo font (`server/assets/Cairo-Variable.ttf`) | Present | **ACTIVE** — commercial PDF Arabic, **not** thermal printing |

---

## 6. Print Host / Agent / Dispatcher / Queue

| Capability | Status |
|------------|--------|
| Print Host | **REMOVED** — no `print-host/` directory |
| Print Agent | **REMOVED** — no `agent/` directory |
| Print Dispatcher (runtime) | **REMOVED** — only `OrderPrintDispatchPort` interface remains |
| Print Queue (DB) | **REMOVED** — `print_jobs` dropped in 0043 |
| Print Workers / background jobs | **None** — no print-specific workers |
| Agent polling / job claiming | **REMOVED** |

---

## 7. Printer Registry / Configuration / Settings

| Capability | Pre-0043 table | Current |
|------------|----------------|---------|
| Printer registry | `printers` | **DROPPED** |
| Restaurant print settings | `restaurant_print_settings` | **DROPPED** |
| Print stations | `print_stations` | **DROPPED** |
| Category → station routing | `categories.stationId` | **DROPPED** (0043) |

No Drizzle schema types for print tables in `drizzle/schema.ts`.

---

## 8. Print Telemetry / Diagnostics

| Capability | Pre-0043 | Current |
|------------|----------|---------|
| Job attempts audit | `print_job_attempts` | **DROPPED** |
| Operational telemetry | `print_job_telemetry_events` | **DROPPED** |
| Agent diagnostic runs | `print_diagnostic_runs` | **DROPPED** |
| Ops event `order_print_dispatch_requested` | — | **ACTIVE** (debug telemetry only) |

---

## 9. Package Scripts

**No printing-specific npm/pnpm scripts** in `package.json`.

---

## 10. Client / Commercial

| Item | Status |
|------|--------|
| `FEATURE_KEYS` (18 keys) | No print keys |
| Client print UI | **REMOVED** |
| `en.json` "print QR code on tables" | Physical QR marketing copy — **unrelated** to thermal printing |

---

## 11. False Positives (Not Thermal Printing)

| Path | Reason matched |
|------|----------------|
| `server/commercial/reporting/snapshotFingerprint.ts` | Report export fingerprint hash |
| `CommercialPdfAdapter.ts` | PDF fingerprint label |
| `client/src/lib/notificationSound.ts` | Comment "verification fingerprint" |

---

## Inventory Summary

| Category | Count active | Count removed | Count future-only |
|----------|-------------|---------------|-------------------|
| Runtime services | 2 consumers + 1 port | ~6 packages/dirs | 2 projection modules (planned) |
| API endpoints | 0 | All legacy | 2 queries (planned) |
| DB tables | 0 | 7 tables | TBD in PRINTING-1 |
| Migrations | 14 historical (0030–0043) | — | — |
