# SHIFT-LIFECYCLE-IMPLEMENTATION-1 — Phase 1 Gap Analysis

| Field | Value |
|---|---|
| **Program** | SHIFT-LIFECYCLE-IMPLEMENTATION-1 |
| **Date** | 2026-07-24 |
| **Mode** | Implementation audit (pre-code) |
| **Constitution** | ADR-ARCH-022 · 028 · **030** · REGISTER-OPERATIONS-PLATFORM-1 · FINANCIAL-SHIFT-LIFECYCLE-1 |

---

## 1. Existing inventory (CRMP-IMPLEMENTATION-1)

| Area | Location | Status |
|------|----------|--------|
| Aggregate contract | `shared/crmp/financialShift/financialShiftContract.ts` | Exists — statuses incomplete |
| Lifecycle | `shared/crmp/financialShift/financialShiftLifecycle.ts` | Exists — `open\|handover_pending\|closed` only |
| Commands | `shared/crmp/financialShift/financialShiftCommands.ts` | Partial — Open/Close/Movement/Count/Handover/Attribution |
| Expected cash | `shared/crmp/financialShift/expectedCash.ts` | Exists (unchanged ownership) |
| Register AR | `shared/crmp/register/*` | Catalog only; deactivate guards active Shift |
| Domain service | `server/crmp/FinancialShiftDomainService.ts` | Partial |
| Repository ports | `server/crmp/CrmpRepository.ts` | Partial — no operator resolve |
| In-memory store | `server/crmp/InMemoryCrmpStore.ts` | Exists |
| Drizzle adapter | `server/crmp/DrizzleCrmpRepository.ts` | Exists — active = open\|handover_pending |
| Domain events | — | **Absent** |
| Persistence enum | `0077_crmp` / `schema.ts` | `open\|handover_pending\|closed` only |
| Tests | shared + server `__tests__` | Partial coverage |

---

## 2. Gap vs ADR-ARCH-030

| Required | Gap |
|----------|-----|
| Statuses: `suspended`, `closing`, `archived` | Missing in VO + lifecycle + DB enum |
| Persisted `pending` forbidden | OK (never existed) |
| Suspend / Resume / BeginClose / AbortClose / CancelOpen / Archive | Missing commands |
| ResolveActive / ByRegister / ByOperator | Missing (active-by-register exists as repo query only) |
| Active set includes suspended+closing | `isActiveShiftStatus` incomplete |
| Canonical events | Missing |
| Close from `closing` + crash recovery | Close only from `open` today |
| Count on `closing` | Count allows open + handover_pending only |
| Idempotent open by id | Service always inserts |
| `closeReason` | Missing on contract |
| Additive DB enum expansion | **Required for Drizzle persistence of new statuses** |

---

## 3. Schema impact (STOP evaluation)

| Question | Answer |
|----------|--------|
| Is schema change required for ADR-030 persistence? | **Yes** — expand `crmp_financial_shifts.status` enum; optional `closeReason` |
| Ownership / redesign? | **No** — additive enum values only; CRMP table only |
| ADR-022 / 028 / 030 violation? | **No** — implements 030; does not modify 022/028 ownership |
| Production deployment authorized? | **No** |

**Decision:** Proceed with **additive migration `0078_crmp_shift_lifecycle`** as *strictly required and justified* under program objective. Production deployment remains unauthorized. Not an Architecture Impact STOP (no redesign / no ownership move).

---

## 4. Out of scope (confirmed)

- UI  
- Settlement Context adoption  
- Settlement Attribution settle-path wiring (domain association commands already present — left intact, not expanded)  
- Register Duty plane persistence (ROP implementation)  
- Device workflows  

---

## 5. Implementation plan

1. Expand `SHIFT_STATUSES` + lifecycle transitions  
2. Implement lifecycle commands + events (collected facts, no bus)  
3. Extend repository (operator resolve, active statuses)  
4. Extend domain service + register deactivate guard  
5. Additive `0078` + schema enum  
6. Comprehensive tests  
7. Certification report  
