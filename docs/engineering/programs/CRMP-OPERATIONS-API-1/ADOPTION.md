# CRMP-OPERATIONS-API-1 — Adoption Certification

| Field | Value |
|---|---|
| **Program** | CRMP-OPERATIONS-API-1 |
| **Date** | 2026-07-24 |
| **Constitution** | ADR-ARCH-022 · 028 · **030** · REGISTER-OPERATIONS-IMPLEMENTATION-1 · CRMP-PRODUCTION-MIGRATION-0079 |
| **API audit** | [`API-AUDIT.md`](./API-AUDIT.md) |
| **Verdict** | **CRMP OPERATIONS API CERTIFIED** |

---

## 1. Executive Summary

Canonical tRPC façades expose certified Register Operations:

- Mount: `appRouter.crmp.register.*`
- Auth: `verifiedProcedure` + `assertRestaurantAccess` (owner / admin)
- Orchestration only → `RegisterDomainService` / `FinancialShiftDomainService`
- DTOs hide events, drawer graphs, persistence rows
- Domain errors mapped to operator-safe TRPC codes

**No UI. No schema. No production migration. No domain redesign. No financial calculations in API.**

---

## 2. API Audit

See [`API-AUDIT.md`](./API-AUDIT.md). Insertion point: `server/crmp/api/crmpRouter.ts` → `crmp` on `appRouter`.

---

## 3. Endpoint Inventory

### Commands (`crmp.register.*` mutations)

| Procedure | Domain |
|-----------|--------|
| `open` | `RegisterDomainService.open` |
| `close` | `.close` |
| `suspend` | `.suspend` |
| `resume` | `.resume` |
| `assignOperator` | `.assignOperator` |
| `releaseOperator` | `.releaseOperator` |
| `reassignOperator` | `.reassignOperator` |
| `attachDevice` | `.attachDevice` |
| `detachDevice` | `.detachDevice` |
| `replaceDevice` | `.replaceDevice` |

### Queries

| Procedure | Source |
|-----------|--------|
| `get` | Register get |
| `getCurrent` | Register + active Shift ref |
| `getDutyStatus` | Register duty fields |
| `getCurrentOperator` | Operator fields |
| `getCurrentDevice` | Device field |
| `getCurrentFinancialShift` | `FinancialShiftDomainService.resolveActive` |
| `listAvailable` | `listByRestaurant` |
| `getHistory` | Shift list by register (refs only) |
| `resolveActive` | `resolveActive` |
| `resolveByDevice` | `resolveByDevice` |
| `resolveByOperator` | `resolveByOperator` |

Catalog provision/activate/deactivate and Financial Shift write commands are **out of scope** (Phase 2 command list).

---

## 4. Authorization Matrix

| Actor | Access |
|-------|--------|
| Restaurant owner (`user`) | Full `crmp.register.*` for owned restaurant |
| Platform `admin` | Full |
| Unauthenticated | `UNAUTHORIZED` |
| Cross-tenant | `FORBIDDEN` via `assertRestaurantAccess` |
| Manager / Supervisor / Settlement Station / Counter (named roles) | **Mapped to owner/admin** until dedicated role principals exist |
| Kitchen / Waiter / QR / Kiosk device roles | **Not exposed** on this router |

Authorization stays in API layer — never in domain.

---

## 5. DTO Specification

| DTO | Contents |
|-----|----------|
| `RegisterDto` | Identity, catalog/duty status, device, operator, version, updatedAt |
| `RegisterCommandResultDto` | `register` + `alreadyApplied` |
| `FinancialShiftRefDto` | Shift id, status, operator, timestamps, version — **no drawer / attributions** |
| `CurrentRegisterViewDto` | Register + duty/operator/device + optional shift ref |
| `RegisterHistoryDto` | Register id + shift refs |

**Never returned:** domain events, repository rows, stack traces, money math.

Contract id: `CRMP-OPERATIONS-API-1` / `1.0.0`.

---

## 6. Error Mapping

| Domain | TRPC |
|--------|------|
| `CrmpNotFoundError` | `NOT_FOUND` |
| `CrmpConflictError` / version conflict | `CONFLICT` |
| `CrmpInvalidTransitionError` / `CrmpInvariantError` | `CONFLICT` (incl. shift-active / illegal Duty) |
| `CrmpValidationError` | `BAD_REQUEST` |
| Zod input | tRPC validation error |
| Access denied | `FORBIDDEN` |
| Unknown | `INTERNAL_SERVER_ERROR` (generic message) |

---

## 7. Regression Results

| Platform | Change? |
|----------|---------|
| CRMP domain | Thin `listByRestaurant` / `listByRegister` reads only |
| Financial Shift ownership | Unchanged |
| Settlement Context / Attribution | Unchanged |
| Order / OSP / Reporting / Check | Unchanged |
| Schema / migrations | **None** |

---

## 8. Test Results

| Suite | Result |
|-------|--------|
| `server/crmp/api/__tests__/*` | **16 PASS** (router 11 + mapper 1 + errors 4) |
| CRMP domain + attribution + guards | **PASS** |
| **Targeted total** | **113/113 PASS** |

Coverage: open/close/suspend/resume, operator, device, resolve, history, shift ref, idempotency, concurrency, permissions, DTO validation, error mapping.

---

## 9. Production Readiness

| Item | Status |
|------|--------|
| API surface registered | **Yes** — `crmp` on `appRouter` |
| Domain orchestration only | **Yes** |
| Auth enforced | **Yes** |
| Schema / migrate | **N/A** (not authorized) |
| UI adoption | **Unblocked** → REGISTER-OPERATIONS-UI-1 retry |
| Dedicated Settlement Station role | Future (documented mapping) |

---

## 10. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Register Operations exposed via canonical APIs | **Met** |
| APIs orchestrate existing domain services only | **Met** |
| No business logic / financial calc in API | **Met** |
| Ownership / financial behavior unchanged | **Met** |
| Authorization enforced | **Met** |
| DTOs hide implementation details | **Met** |
| API tests pass | **Met** |
| Production readiness (API) | **Met** |

### Verdict

**CRMP-OPERATIONS-API-1 — CERTIFIED**

Authorized next: re-open **REGISTER-OPERATIONS-UI-1** consuming `crmp.register.*`.
