# GLOBAL-NUMERIC-PRESENTATION-POLICY-1 — Implementation

**Date:** 2026-07-16  

---

## 1. Delivered surface

| Path | Role |
|------|------|
| `shared/utils/numericPresentation.ts` | Platform-wide Western digit helpers |
| `client/src/lib/numericPresentation.ts` | Client re-export façade |
| `shared/utils/timezone.ts` | Force `numberingSystem: "latn"` |
| `client/src/lib/currencyLocale.ts` | Money formatting with Western digits |
| `client/src/lib/kitchen/kitchenPresentation.ts` | Remove Eastern-digit conversion |
| `client/src/lib/reporting-exports/format.ts` | Consume shared `toWesternDigits` |
| `client/src/lib/settlementTrendDisplay.ts` | Chart period labels via `formatLocaleDateTime` |
| `client/src/lib/print-workspace/viewModels.ts` | Print timestamps |
| `client/src/pages/waiter/WaiterTableWorkspaceStage.tsx` | Waiter datetime |
| `client/src/pages/Dashboard.tsx` | Offer date labels |
| `client/src/components/menu/OffersTabPanel.tsx` | Offer validity labels |

---

## 2. Tests / guards

| Path | Role |
|------|------|
| `shared/utils/__tests__/numericPresentation.test.ts` | Unit tests |
| `client/src/lib/__tests__/globalNumericPresentation.architecture.guards.test.ts` | Architecture guards |
| Kitchen / reporting-exports / settlement trend tests | Regression |

---

## 3. Explicit non-changes

- Reporting Platform contracts / services  
- Order / Check / Session / Runtime / Business Settings / Business Identity  
- No migrations  
- No KPI calculations  

---

## 4. Adoption guidance for new UI

```ts
import { formatLocaleDateTime, formatLocaleNumber, toWesternDigits } from "@/lib/numericPresentation";
```

Or use `formatInRestaurantTimezone` / `formatCurrencyAmount`, which already enforce Western digits.
