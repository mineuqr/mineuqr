# PG-1C.3A — Wave 1 UI Authority Migration

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.3A — read-only UI consumption of commercial entitlements  
**Date:** 2026-06-07  
**Status:** Implemented (observation only)

---

## 1. Summary

Wave 1 exposes canonical `CommercialEntitlements` in the client **without** changing mutation gates, billing, routing authorization, or legacy subscription checks.

| Deliverable | Location |
|---|---|
| Hook | `client/src/hooks/useCommercialEntitlements.ts` |
| Display helpers | `client/src/lib/commercial/entitlementsDisplay.ts` |
| Status UI | `client/src/components/commercial/*` |
| Diagnostics page | `client/src/pages/CommercialDiagnostics.tsx` |
| Route | `/commercial/diagnostics` |

---

## 2. Hook

```typescript
const { context, entitlements, isLoading, isError, error, isReady, refetch } =
  useCommercialEntitlements();
```

- Wraps `trpc.commercial.getEntitlements.useQuery()`
- Enabled when `authResolved && isAuthenticated` (override via `{ enabled: false }`)
- **Does not** gate buttons, routes, or mutations

---

## 3. UI Components (read-only)

| Component | Purpose |
|---|---|
| `CommercialPlanName` | Resolved plan badge |
| `CommercialTrialStatus` | Trial active + expiration |
| `CommercialLimitsDisplay` | restaurants / categories / items |
| `CommercialFlagsDisplay` | MRR, revenue, invoice, tier flags |
| `CommercialFeaturesDisplay` | Enabled vs disabled feature lists |
| `CommercialStatusPanel` | Composed status summary |
| `CommercialEntitlementsDiagnostics` | Full diagnostics + raw JSON |

---

## 4. Diagnostics View

**URL:** `/commercial/diagnostics`

Shows:

- `CommercialContext` (adapter output)
- `CommercialEntitlements` (resolver output)
- Human-readable status, limits, flags, features

Banner clarifies: read-only, no behavior change.

---

## 5. Tests

```bash
npx vitest run client/src/lib/commercial client/src/hooks/useCommercialEntitlements.test.ts
```

| Suite | Coverage |
|---|---|
| `entitlementsDisplay.test.ts` | Query gating, limits formatting, feature split, plan labels |
| `useCommercialEntitlements.test.ts` | Loading prerequisites / auth gating |

---

## 6. Safety

**Unchanged:**

- `isSubscriptionActive`, template/color/font server gates
- Billing, MRR, invoices
- Router authorization
- Button visibility / action disabling

**Added only:**

- Optional diagnostics route
- Reusable read-only components for future Wave 2 UI alignment

---

## 7. Next Phase

**PG-1C.3B / Wave 2** — use `entitlements.features.*` for display hints (still coordinate with server gates before enforcement).

---

*Read-only UI. No authority replacement.*
