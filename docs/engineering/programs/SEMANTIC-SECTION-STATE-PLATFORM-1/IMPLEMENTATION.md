# IMPLEMENTATION — SEMANTIC-SECTION-STATE-PLATFORM-1

**Date:** 2026-07-29  
**Type:** Presentation Platform Adoption  
**Status:** Implemented — awaiting Architecture Authority review  
**Constraints:** Presentation only · No commit / push / deploy

---

## 1. Platform package

`client/src/design-system/semantic-section-state/`

| Primitive | Role |
|---|---|
| `SemanticSectionState` | Status switcher (loading / skeleton / empty / error / success / offline / refreshing) |
| `SemanticLoadingState` | Spinner / inline / page loading |
| `SemanticSkeletonState` | kpi · executive · cardList · tableRows · list · inline |
| `SemanticEmptyState` | panel · premium · admin · page densities |
| `SemanticErrorState` | section · page (+ retry slot presentation) |
| `SemanticSuccessState` | Optional success chrome |
| `SemanticOfflineState` | Optional offline chrome |
| `SemanticRefreshingState` | Subtle refresh indicator |
| `SemanticRetrySlot` | Retry button region (handler remains feature-owned) |
| `SemanticStateIllustration` | Icon well |
| `SemanticStateActions` | Action cluster |

---

## 2. Ownership move

| Former owner | New ownership |
|---|---|
| `semantic-card` `SemanticEmptyState` / executive empty | Section State Platform (card re-exports for BC) |
| `semantic-card` KPI / executive skeletons | Section State Platform (card re-exports for BC) |
| `RestaurantSectionEmpty` / `Error` | Facades → platform |
| `AdminEmptyState` / `AdminLoadingState` | Facades → platform |
| `AppLoading` / `Empty` / `Error` | Facades → platform |
| `SecuritySectionLoading` / `Error` | Adapters → platform (+ i18n at feature) |

---

## 3. Migrated / adapted surfaces

Restaurant section empty/error (all importers via facade) · Admin empty/loading · App page states · Security section states · Screen fleet empty/loading · Orders workspace empty/loading · Executive empty/skeleton (via card re-exports)

---

## 4. Explicitly not migrated

Kitchen operational idle/loading · Screen boot / pairing wait · Print monitors · Payment / refund processing · Register onboarding empty · Menu guest empty · AuthGate `PageDataLoading` · Semantic Table / Detail Sheet state slots · Chart-geometry skeletons (feature layout)

---

## 5. Accessibility

- Loading / empty / success / offline: `role="status"` + `aria-live="polite"` (+ `aria-busy` where applicable)
- Error: `role="alert"`
- Retry buttons disabled while busy; spinner announced via busy state

---

## 6. Validation

```bash
npx vitest run client/src/design-system/semantic-section-state/__tests__/semanticSectionStatePlatform.architecture.guards.test.ts
```

Run from repo root.
