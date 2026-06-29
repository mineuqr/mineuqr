# ORDERS-READ-MODEL-1 — Phase 3A Architecture Compliance Report

**Program:** ORDERS-READ-MODEL-1 — Staging Preparation (Phase 3A)  
**Reference:** READ-ARCHITECTURE-1 RA-08  
**Date:** 2026-06-29  
**Exit verdict:** PASS (Phase 3A scope — staging tooling, no activation)

---

## Scope Statement

Phase 3A delivers **staging deployment tooling, validation scripts, and operational procedures** for projection store migration and backfill. No production activation, dispatch wiring, or read APIs.

---

## RA-08 Phase 3A Requirements

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Apply migration 0046 (staging) | Journalized; `pnpm db:migrate` + `--verify-schema` | ✓ Tooling |
| Projection backfill | `order-read-backfill-execute.ts` | ✓ |
| Full / tenant / partial modes | Backfill service + staging scripts | ✓ |
| Integrity audit vs write model | `OrderReadProjectionIntegrityChecker` + `--validate` | ✓ |
| Backfill telemetry | Ops events + run table | ✓ |
| Rollback / rebuild | `--rollback-tenant`, `--rebuild-tenant` | ✓ |

---

## Production Safety (Mandatory)

| Guard | Phase 3A |
|-------|----------|
| `ORDER_READ_PROJECTIONS_ENABLED` default false | ✓ Enforced in scripts |
| Publisher uses integration registry only | ✓ Unchanged |
| No read APIs / tRPC changes | ✓ |
| No Dashboard / React / `order.list` changes | ✓ |
| Write model never modified by staging ops | ✓ DELETE on `order_read_*` only |

---

## RA-09 Tenant Isolation

| Check | Implementation |
|-------|----------------|
| PK includes `restaurantId` | Schema 0046 |
| Tenant-scoped backfill | `--restaurant-id` |
| Tenant-scoped rollback | `--rollback-tenant` |
| Leak detection | `tenant_leak` mismatch type in integrity checker |

---

## Deliverables

| Report | Status |
|--------|--------|
| Staging Deployment Report | ✓ |
| Projection Integrity Report | ✓ |
| Backfill Validation Report | ✓ (updated) |
| Projection Consistency Report | ✓ |
| Telemetry Validation Report | ✓ |
| Rollback Validation Report | ✓ |
| Migration Readiness Report | ✓ (updated) |

---

## Exit Verdict

**PASS** — Phase 3A staging preparation complete. Operators can deploy to staging using documented procedures. Phase 3B (shadow read APIs + controlled dispatch) remains gated.
