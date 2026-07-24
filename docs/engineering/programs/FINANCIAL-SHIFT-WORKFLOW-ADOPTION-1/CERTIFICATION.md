# FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — Certification

**Status:** CERTIFIED  
**Date:** 2026-07-25  
**Type:** Application Workflow Adoption (no Domain redesign)

---

## 1. Executive Summary

Production Ops now links **Register Duty** and **Financial Shift** through an application workflow only:

1. Open Duty (`crmp.register.open`) — unchanged, independent  
2. Opening Float dialog → `crmp.financialShift.open`  
3. Settlements resolve active Shift → Attribution  
4. Close: Cash Count → `crmp.financialShift.close` (recordCount + close) → Duty close  

Register Aggregate does **not** own Financial Shift. Settlement does **not** create Shifts.

---

## 2. Gap Analysis

See [GAP-ANALYSIS.md](./GAP-ANALYSIS.md). Missing link was Opening Float + FinancialShift.open API/UI after Duty open.

---

## 3. Workflow Diagram

```
Duty Closed
    │  فتح الصندوق
    ▼
crmp.register.open  (Duty only)
    │
    ▼
Opening Float Dialog (required while Duty open ∧ no Shift)
    │
    ▼
crmp.financialShift.open(openingFloatAmount, currencyCode, operator)
    │
    ▼
Ops refresh — show عهدة / وردية / وقت الفتح / expected cash
    │
    ▼
Settlements (registerId hint + operator) → Context → Attribution
    │
    ▼
إغلاق الصندوق
    │
    ▼
Cash Count Dialog (actual cash)
    │
    ▼
crmp.financialShift.close  [= recordCount(final) → domain close]
    │
    ▼
crmp.register.close
```

---

## 4. API Inventory

| Procedure | Role |
|-----------|------|
| `crmp.financialShift.open` | Thin → `FinancialShiftDomainService.open` |
| `crmp.financialShift.close` | Thin app corridor: `recordCount(final)` then `close` |
| `crmp.financialShift.getCurrent` | Active Shift view + expected cash (domain read) |
| `crmp.register.open/close/...` | Unchanged Duty plane |

Façade: `server/crmp/api/crmpFinancialShiftOperationsService.ts`  
Router: `server/crmp/api/crmpRouter.ts` (`financialShift` namespace)

---

## 5. UI Inventory

| Surface | Path |
|---------|------|
| Ops host | `RegisterOperationsPanel.tsx` |
| Opening float | `OpeningFloatDialog.tsx` |
| Cash count | `CashCountDialog.tsx` |
| Workflow helpers | `registerOperationsWorkflow.ts`, `openingFloatPresentation.ts` |
| Station hint | `registerOperationsStationContext.ts` → Manager markPaid `registerId` |
| Copy | `registerOperationsCopy.ts` (عهدة / عدّ / ملخص) |

---

## 6. Financial Lifecycle Verification

| Step | Verified |
|------|----------|
| Duty open ≠ Shift open | API test + domain guard |
| Opening float required for Shift open | Zod + domain `assertNonNegativeMoney` (zero allowed) |
| Active Shift on getCurrent | API test |
| Close requires final count | Domain; app records count before close |
| Variance from domain count | Returned on `finalCount.varianceAmount` |
| Duty close blocked while Shift active | Existing domain + Ops order Shift→Duty |

---

## 7. Settlement Verification

| Mechanism | Adoption |
|-----------|----------|
| Settlement Context | Consumes active Shift; never fabricates |
| Manager markPaid | Passes `registerId` from remembered Ops station |
| Operator hint | `actorUserId` → `operatorUserId` (existing) |
| Attribution | Existing post-commit fail-open; succeeds when Shift open |

No Settlement redesign.

---

## 8. Regression Results

Architecture guards updated and green:

- Register domain has no `openFinancialShift`
- API façade has no `computeExpectedCash` / `toCents`
- Shift ops service does not call Register open/close
- Presentation Duty mutations remain separate from Shift mutations

---

## 9. Test Results

```
server/crmp/api/__tests__/crmpRouter.test.ts                     14 passed
server/crmp/__tests__/crmp.architecture.guards.test.ts           14 passed
client/.../financialShiftWorkflowPresentation.test.ts             5 passed
client/.../registerOperationsPresentation.architecture.guards     6 passed
client/.../registerOperationsAdaptive.test.ts                     6 passed
────────────────────────────────────────────────────────────────────────
Total                                                            45 passed
```

Settlement Context / Attribution suites remain green (regression).

---

## 10. Production Readiness

| Item | Ready |
|------|-------|
| Thin APIs deployed with app | Yes (code) |
| Ops Opening Float workflow | Yes |
| Close cash-count workflow | Yes |
| Schema / migrations | No change required |
| Domain ownership | Unchanged |

**Ops go-live checklist:** Activate register → Open Duty → enter float → confirm Shift → settle paid order → verify attribution row → close via cash count.

---

## 11. Final Certification

**FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 is CERTIFIED.**

Success criteria:

- [x] Register.open independent  
- [x] FinancialShift.open independent  
- [x] Application workflow links them  
- [x] Opening Float collected  
- [x] Shift active before sales continue (modal gate)  
- [x] Settlements can receive financialShiftId (context + register hint)  
- [x] Attribution path active when Shift open  
- [x] Reporting consumes Shift facts via existing read models (no ownership change)  
- [x] No Domain redesign / ownership changes  
- [x] Tests pass  

---

## Stop-condition check

No Architecture Impact Report required: Register does not own Shift; Settlement does not create Shifts; Reporting remains read-only.
