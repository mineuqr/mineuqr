# KITCHEN-DISPLAY-DENSITY-1 — Kitchen Runtime Display Density Architecture
## Phase C — Certification Report

**Program:** KITCHEN-DISPLAY-DENSITY-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

KITCHEN-DISPLAY-DENSITY-1 activates **runtime display density** for Kitchen and Expo operational screens. Density from Screen Management flows through `RuntimeDisplayDensityManager`, resolves into an immutable `PresentationDensityModel`, and is exposed on Runtime Context for presentation consumption. **Comfortable** (including config `large`) and **Compact** are operational. Blocked roles receive density configuration but do not activate it. No API, database, authentication, or category filtering changes were made.

---

## 2. Root Cause Analysis

After SCREEN-CONFIG-RUNTIME-1, `displayDensity` was loaded into `runtimeConfiguration.tracked.density` with `densityActivated: false`. Kitchen presentation used hardcoded Tailwind spacing (`p-6`, `text-2xl`, `gap-5`) in `KitchenExecutionCard` — density was a management setting with no runtime pipeline.

---

## 3. Architecture Decision

**Decision:** Introduce `RuntimeDisplayDensityManager` as the sole density authority, producing immutable `PresentationDensityModel` metrics consumed via Runtime Context.

**Rationale:**
- Density is a runtime capability, not scattered CSS conditions
- Model computed once per configuration change
- Presentation applies resolved class tokens only
- Unknown densities fall back to comfortable with health warning
- Capability negotiation via `supportsDensity` + `densityActivated`

---

## 4. Runtime Display Density Architecture

```
Screen Management (displayDensity)
        │
        ▼
RuntimeConfigurationManager
        │
        ▼
RuntimeDisplayDensityManager
  Validate → Normalize → Resolve metrics
        │
        ▼
Runtime Context (resolvedDensityModel)
        │
        ▼
KitchenScreenPanel / KitchenExecutionCard
```

---

## 5. Density Pipeline

| Stage | Component | Responsibility |
|-------|-----------|----------------|
| Config | `runtimeConfigurationManager.ts` | `densityActivated: true` when `supportsDensity` |
| Manage | `runtimeDisplayDensityManager.ts` | Normalize, resolve model, cache |
| Models | `presentationDensityModels.ts` | Immutable comfortable/compact metrics |
| Context | `useRuntimeOrchestrator.ts` | Merge density into exposed context |
| Present | `KitchenScreenPanel.tsx` | Read `context.resolvedDensityModel` |

---

## 6. RuntimeDisplayDensity Contract

```typescript
RuntimeDisplayDensity {
  version, density, layoutScale, spacingScale, fontScale, ticketDensity
  updatedAt, state, configurationVersion, configuredDensity
  usedFallback, validationErrors
}
```

---

## 7. RuntimeDisplayDensityManager

| Method | Responsibility |
|--------|----------------|
| `syncFromConfiguration()` | Load, validate, normalize, resolve model |
| `getPresentationModel()` | Immutable resolved metrics |
| `detectConfigurationChange()` | Version mismatch |
| `buildHealth()` | Density health snapshot |
| `dispose()` | Teardown |

Single instance in orchestrator via `densityManagerRef`.

---

## 8. Presentation Density Model

`PresentationDensityModel` provides readonly Tailwind class tokens:
- Card: padding, gap, min-height, radius
- Column: gap, section spacing, ticket list spacing
- Typography: order number, table label, line items, section title
- Notes, timing, warning, empty state classes

Components never interpret `large`/`compact` config values directly.

---

## 9. Runtime Integration

Runtime Context exposes:
- `displayDensity` — canonical (`comfortable` | `compact`)
- `densityState` — lifecycle state
- `densityVersion` — model version counter
- `resolvedDensityModel` — immutable presentation metrics

Orchestrator exposes `reloadDensity()` (aliases configuration reload).

Config mapping:
- `large` → `comfortable`
- `comfortable` → `comfortable`
- `compact` → `compact`
- unknown → `comfortable` + fallback warning

---

## 10. Health Architecture

`DisplayDensityHealth` reports:
- `density`, `configuredDensity`, `densityVersion`
- `configurationVersion`, `appliedVersion`
- `validationStatus`, `validationErrors`, `usedFallback`
- `lastReloadAt`

Merged into `RoleRuntimeHealth` as `displayDensity`, `displayDensityVersion`.

---

## 11. Diagnostics

`ScreenDiagnosticsPanel` and `collectRoleDiagnostics()` include:
- `displayDensity`, `displayDensityHealth`
- `densityState`, `densityVersion`, `resolvedDensity`
- Configured vs resolved density, fallback status

---

## 12. Files Added

| File |
|------|
| `client/src/lib/operational-screen/density/runtimeDisplayDensityContract.ts` |
| `client/src/lib/operational-screen/density/runtimeDisplayDensityManager.ts` |
| `client/src/lib/operational-screen/density/presentationDensityModels.ts` |
| `client/src/lib/operational-screen/__tests__/runtimeDisplayDensityManager.test.ts` |
| `docs/engineering/programs/KITCHEN-DISPLAY-DENSITY-1/IMPLEMENTATION.md` |

---

## 13. Files Modified

| File | Change |
|------|--------|
| `configuration/runtimeConfigurationManager.ts` | `densityActivated: true` for capable roles |
| `configuration/runtimeConfigurationContract.ts` | `densityActivated: boolean` |
| `runtimeTypes.ts` | Density fields on context |
| `bootstrapLogic.ts` | Default density on context assembly |
| `useRuntimeOrchestrator.ts` | Density manager integration |
| `KitchenScreenPanel.tsx` | Consumes `resolvedDensityModel` |
| `KitchenExecutionCard.tsx` | Applies `densityModel` tokens |
| `KitchenWorkspacePanel.tsx` | Default comfortable model (dashboard) |
| `roles/runtimeRoleContract.ts` | Density health fields |
| `roles/runtimeRoleHealth.ts` | Density diagnostics |
| `ScreenDiagnosticsPanel.tsx` | Density diagnostics |
| `__tests__/architectureGuards.test.ts` | Density architecture guards |
| `__tests__/runtimeConfigurationManager.test.ts` | `densityActivated` expectation |

---

## 14. Validation

- TypeScript `tsc --noEmit` — **PASS**
- Operational screen tests — **58/58 PASS**
- Architecture guards — **14/14 PASS**
- No density config reads in presentation components
- No hardcoded compact/comfortable conditions in KitchenExecutionCard

---

## 15. Test Results

```
runtimeDisplayDensityManager.test.ts  6 passed
runtimeConfigurationManager.test.ts   6 passed
architectureGuards.test.ts           14 passed
(+ 32 other operational-screen tests)
Total: 58 passed
```

---

## 16. Performance Validation

- `PresentationDensityModel` resolved once in `syncFromConfiguration()`
- Immutable readonly model referenced by presentation
- `useMemo` on exposed context keyed by `densityVersion`
- No per-render density calculations

---

## 17. Production Risks

| Risk | Mitigation |
|------|------------|
| Dashboard kitchen workspace | Uses `COMFORTABLE_DENSITY_MODEL` default explicitly |
| Unknown density values | Fallback to comfortable + health warning |
| Blocked roles | Density stays inactive via capability gate |

---

## 18. Future Programs

| Reserved | Notes |
|----------|-------|
| `dense` | Canonical value reserved, not operational |
| `custom` | Canonical value reserved, not operational |

---

## 19. Architecture Compliance Review

| Rule | Status |
|------|--------|
| RuntimeDisplayDensity contract | ✓ |
| RuntimeDisplayDensityManager (single) | ✓ |
| Kitchen density operational | ✓ |
| Expo density operational | ✓ |
| Blocked roles preserved | ✓ |
| Runtime Context updated | ✓ |
| Presentation uses Density Model | ✓ |
| Health updated | ✓ |
| Diagnostics updated | ✓ |
| Live density updates | ✓ |
| No duplicated density logic | ✓ |
| Category filtering unchanged | ✓ |
| No API/DB changes | ✓ |

---

## 20. Evidence

**Single manager:**
```typescript
densityManagerRef.current.syncFromConfiguration(runtimeConfiguration, capabilities);
```

**Presentation consumes model only:**
```typescript
const densityModel = context.resolvedDensityModel;
<KitchenExecutionCard densityModel={densityModel} />
```

**Architecture guard:**
```typescript
expect(kitchen).toContain("resolvedDensityModel");
expect(kitchen).not.toContain("displayDensity");
expect(card).not.toContain("compact");
```

**Config `large` → comfortable:**
```typescript
expect(resolved.density).toBe("comfortable");
```

---

## 21. Final Certification Decision

**CERTIFIED**

KITCHEN-DISPLAY-DENSITY-1 Phase C satisfies all success criteria. Display density is now a formal runtime capability with contract, manager, presentation model, health, and diagnostics — completing the operational screen runtime architecture stack (ROLE-RUNTIME-1 → SCREEN-CONFIG-RUNTIME-1 → KITCHEN-CATEGORY-FILTER-1 → KITCHEN-DISPLAY-DENSITY-1).
