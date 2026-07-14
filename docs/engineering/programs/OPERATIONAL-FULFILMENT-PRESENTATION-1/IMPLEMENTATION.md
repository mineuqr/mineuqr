# OPERATIONAL-FULFILMENT-PRESENTATION-1 — Implementation
## Certification Report

**Program:** OPERATIONAL-FULFILMENT-PRESENTATION-1  
**Type:** Architecture Implementation (Operational Presentation)  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Operational screens now display fulfilment from projected Operational DTO fields (`fulfilmentLabel` / `fulfilmentAnchorType` / `serviceMode`) via a single shared presentation renderer. TableNumber heuristics were removed from Kitchen, Expo, Orders Workspace, Print Workspace, and print ticket text. Projection, Read Model, Order Domain, and Runtime were not modified.

---

## 2. Architecture audit

See `ARCHITECTURE.md` §1.

---

## 3. Presentation ownership map

See `ARCHITECTURE.md` §2–3.

---

## 4. Presentation changes

| Surface | Change |
|---------|--------|
| Shared formatter | New `formatProjectedFulfilment.ts` |
| Kitchen / Expo | `mapKitchenTicketPresentation` + client `KitchenTicketDto` fields |
| Orders Workspace | `mapActiveOrderPresentation` consumes DTO fulfilment |
| Print Workspace | List/detail use projected labels |
| Print payload text | Prefers `fulfilmentLabel` over `tableNumber` |
| Dashboard OrdersTab | Stamps when present (legacy list compat) |

---

## 5. Shared rendering

`formatProjectedFulfilmentLabel` / `localizedProjectedFulfilmentLabel` are the single renderer. Operational typography and kitchen helpers wrap it; cards only render `presentation.fulfillment.label`.

---

## 6. Files changed

| Area | Files |
|------|--------|
| Shared presentation | `formatProjectedFulfilment.ts`, `mapOrderPresentation.ts`, `orderPresentationModel.ts`, `index.ts` |
| Kitchen | `types.ts`, `kitchenPresentation.ts`, `viewModels.ts` |
| Ops typography | `operationalCardTypography.ts` |
| Print Workspace | `viewModels.ts`, `PrintWorkspacePanel.tsx` |
| Print text | `PrintPayloadTextSerializer.ts` |
| Dashboard | `Dashboard.tsx` (OrdersTab stamps) |
| Tests | presentation / kitchen / print / architecture guards |
| Docs | program ARCHITECTURE + IMPLEMENTATION; ADR-ARCH-019 |

---

## 7. Compatibility

- Table service QR path still shows `Table N` from projected label `N`.
- Station / takeaway show projected stamps (`Station A`, `Take Away` / `سفري`).
- No Session / Runtime / Identity queries from presentation.

---

## 8. Test summary

| Suite | Result |
|-------|--------|
| `formatProjectedFulfilment.test.ts` | **PASS** |
| `kitchenPresentation` / `viewModels` / typography | **PASS** |
| `orderPresentationArchitecture.guards` (+ fulfilment guard) | **PASS** |
| Print workspace + print serializer | **PASS** |
| Expo / kitchen category / arrival / notes / perf | **PASS** |
| **Total (scoped)** | **87/87 PASS** |

---

## 9. Build / certification gates

| Gate | Result |
|------|--------|
| Presentation regression suites | **87/87 PASS** |
| `vite build` | **PASS** |
| Projection / Domain / Runtime / Read Model | **Unchanged** |

---

## 10. Certification

**CERTIFIED** — ops surfaces consume projected fulfilment only; shared renderer owns formatting; architecture guards pass; QR table display preserved via projected label.
