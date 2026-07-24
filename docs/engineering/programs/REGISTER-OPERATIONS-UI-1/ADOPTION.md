# REGISTER-OPERATIONS-UI-1 — UI Adoption Certification (Reopened)

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-UI-1 (REOPENED) |
| **Date** | 2026-07-24 |
| **Constitution** | ADR-ARCH-028 · 030 · CRMP-OPERATIONS-API-1 · REGISTER-OPERATIONS-IMPLEMENTATION-1 |
| **UI audit** | [`UI-AUDIT.md`](./UI-AUDIT.md) |
| **Prior STOP** | [`UI-IMPACT-REPORT.md`](./UI-IMPACT-REPORT.md) — superseded |
| **Verdict** | **REGISTER OPERATIONS UI CERTIFIED** |

---

## 1. Executive Summary

Register Operations are available in the Restaurant Manager dashboard via a touch-first **Register Ops** workspace tab consuming **only** `crmp.register.*`.

- No backend / domain / schema / migration changes  
- No financial calculations in the UI  
- Authorization inherited from API (`verifiedProcedure` + restaurant access)  
- Station mode enlarges controls for Counter / tablet use (presentation only)

---

## 2. UI Audit

See [`UI-AUDIT.md`](./UI-AUDIT.md).

---

## 3. Navigation Integration

| Item | Value |
|------|-------|
| Tab | `register` |
| URL | `/dashboard?restaurant={id}&section=register` |
| Sidebar | Workspace group after Settlements |
| Mount | `Dashboard.tsx` → `RegisterOperationsPanel` |
| Excluded hosts | Waiter, Kiosk, Kitchen, Expo, QR, Pickup |

---

## 4. User Flow Validation

| Flow | API |
|------|-----|
| Open / Close / Suspend / Resume | `crmp.register.open\|close\|suspend\|resume` |
| Assign / Release / Reassign | `assignOperator\|releaseOperator\|reassignOperator` |
| Attach / Detach / Replace device | `attachDevice\|detachDevice\|replaceDevice` |
| Resolve active | `resolveActive` (fetch) |
| Refresh | Invalidate + refetch queries |
| Recovery | Resume (suspended) + Resolve + Refresh |

---

## 5. Screen Inventory

Single composed panel (no duplicate forms):

| Area | Content |
|------|---------|
| Register Dashboard | Available registers list + live selection |
| Register Details | Duty, catalog, version, availability labels |
| Duty / Operator / Device | Status cards + action groups |
| Financial Shift Reference | From `getCurrent` / history refs |
| History | `getHistory` shift list |
| Recovery Panel | Suspended resume + resolve + refresh |

---

## 6. Component Architecture

| Layer | Path |
|-------|------|
| Panel | `client/src/components/register-operations/RegisterOperationsPanel.tsx` |
| Presentation | `client/src/lib/register-operations-presentation/` |
| Hooks | `useRegisterOperationsQueries` / `Mutations` / `useResolveActiveRegister` |
| Copy / errors / VM | Colocated; ar/en |

---

## 7. Permission Matrix

| Actor | UI |
|-------|-----|
| Restaurant owner / admin | Full tab (API enforces) |
| Unauthorized | API `FORBIDDEN` / `UNAUTHORIZED` → toast / alert |
| Manager / Supervisor / Settlement Station (named) | Mapped via owner dashboard auth (API matrix) |
| Kitchen / Waiter / Kiosk | Tab not mounted |

UI does not duplicate authorization rules — failed mutations surface API messages.

---

## 8. Error UX

| Kind | Handling |
|------|----------|
| NOT_FOUND / CONFLICT / BAD_REQUEST | Operator toast / alert; prefer API message when safe |
| FORBIDDEN / UNAUTHORIZED | Not authorized copy |
| Offline / network | Offline message + Retry |
| Loading / syncing | Spinners; no permanent business cache |

No stack traces.

---

## 9. Regression Results

| Surface | Change? |
|---------|---------|
| Backend / CRMP / Shift / Settlement / Attribution | **None** |
| Waiter / Kiosk / Kitchen / QR | **None** (not mounted) |
| Settlements / Sessions / Orders tabs | **Unchanged** |

---

## 10. Test Results

| Suite | Result |
|-------|--------|
| `register-operations-presentation/__tests__/*` | **9/9 PASS** |
| Architecture guards (API-only, hosts, tab wiring) | **PASS** |
| View model + error presentation | **PASS** |

---

## 11. Production Readiness

| Item | Status |
|------|--------|
| Manager host | **Ready** |
| Counter / tablet | Station mode **Ready** |
| Dedicated Settlement Station device role | Future (backend out of scope) |
| Register provision UI | Blocked until catalog API (empty-state handled) |
| Financial Shift write UI | Out of scope (refs only) |

---

## 12. Final Certification

| Success criterion | Status |
|-------------------|--------|
| Register Operations available in UI | **Met** |
| Consumes only `crmp.register.*` | **Met** |
| No frontend business / financial logic | **Met** |
| No backend / schema changes | **Met** |
| Auth inherited from API | **Met** |
| Responsive / touch-first | **Met** (station mode) |
| Accessibility basics (labels, roles, alerts) | **Met** |
| UI tests pass | **Met** |
| Production readiness (Manager host) | **Met** |

### Verdict

**REGISTER-OPERATIONS-UI-1 — CERTIFIED**

Prior STOP is closed. Register Operations UI is production-ready on the Manager dashboard host.
