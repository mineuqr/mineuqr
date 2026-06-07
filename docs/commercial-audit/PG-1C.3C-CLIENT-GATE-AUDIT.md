# PG-1C.3C — Client Gate Audit

**Date:** 2026-06-07  
**Scope:** Client-side commercial visibility gates only  
**Authority path:** `useCommercialFeatureVisibility()` → `featureVisibility.ts` → `useCommercialEntitlements()` → `commercial.getEntitlements`

## Summary

| Classification | Count | Notes |
|---|---:|---|
| **MIGRATED** | 12 | UI visibility now flows through unified hook + helpers |
| **ACTIVE** | 1 | Catalog metadata (`isPremium`) consumed by `isTemplateLocked()` |
| **KEEP_TEMPORARY** | 4 | Billing ops, admin CRUD, guest ordering — not owner visibility gates |
| **REDUNDANT** | 0 | Removed (`isAdmin` duplicate in customizers) |
| **NEEDS_MIGRATION** | 0 | All owner-facing visibility gates consolidated |

**Consolidation progress:** 12 / 17 registry entries migrated for visibility (71%). Remaining 5 entries are intentionally out of scope (billing/admin/server-driven).

## Search Results

Patterns searched in `client/**/*.{ts,tsx}`:

| Pattern | Remaining in UI gates | Classification |
|---|---|---|
| `planId` | Admin forms, checkout mutations | KEEP_TEMPORARY (billing/admin) |
| `plan?.id` | None in visibility logic | MIGRATED → `isCanonicalCurrentPlan()` |
| `subscription?.planId` | AdminManagement only | KEEP_TEMPORARY |
| `isSubscriptionActive` | None in client | Removed in PG-1C.3B |
| `isTrial` / `checkTrialStatus` | None in client UI | MIGRATED → entitlements trial helpers |
| `premiumTemplateIds` | None | Replaced by `features.templates` |
| `BASIC` / `PROFESSIONAL` / `ENTERPRISE` | Display maps in `entitlementsDisplay.ts` only | Canonical labels (not gates) |

## Gate Inventory

### MIGRATED (12)

| ID | File | Legacy | Authority path |
|---|---|---|---|
| template-premium-lock | TemplateSelector.tsx | `isSubscribed` / `checkTrialStatus` | `isTemplateLocked()` |
| template-upgrade-notice | TemplateSelector.tsx | `!isSubscribed` notice | `showTemplatesUpgrade` |
| custom-colors-panel | ColorCustomizer.tsx | `isSubscribed \|\| isAdmin` | `showCustomColors` |
| custom-fonts-panel | FontCustomizer.tsx | `isSubscribed \|\| isAdmin` | `showCustomFonts` |
| pricing-trial-banner | Pricing.tsx | `checkTrialStatus` | `isTrialActive` / `isTrialExpired` |
| pricing-current-plan | Pricing.tsx | `currentSub?.plan?.id === plan.id` | `isCanonicalCurrentPlan()` |
| dashboard-expiry-warning | Dashboard.tsx | `subscription.getByRestaurant` | `subscriptionExpiryWarning` |
| reports-upgrade-banner | Dashboard.tsx | ungated reports | `showReportsUpgrade` |
| excel-upgrade-label | Dashboard.tsx | ungated Excel | `showExcelUpgrade` |
| subscription-plan-badge | SubscriptionManagement.tsx | `plan.nameAr` only | `canonicalPlanLabel()` |
| payment-history-plan-label | PaymentHistory.tsx | `getCurrentSubscription` name | `canonicalPlanLabel()` + fallback |
| subscription-success-display | SubscriptionSuccess.tsx | `getCurrentSubscription` display | `canonicalPlanLabel()` + fallback |

### ACTIVE (1)

| ID | File | Legacy | Notes |
|---|---|---|---|
| menu-templates-ispremium | MenuTemplates.tsx | `isPremium` catalog flag | Lock decision via `isTemplateLocked(isPremium, entitlements)` |

### KEEP_TEMPORARY (4)

| ID | File | Reason |
|---|---|---|
| guest-ordering-ui | MenuView.tsx | Server-driven `order.canOrder` for guests |
| admin-plan-id-forms | AdminManagement.tsx | Admin operational CRUD, not owner visibility |
| admin-kpi-hints | AdminKPISection.tsx | Server admin KPIs |
| pricing-checkout-planid | Pricing.tsx | Billing API requires numeric `planId` for mutations |

## New Artifacts (PG-1C.3C)

| Artifact | Purpose |
|---|---|
| `client/src/hooks/useCommercialFeatureVisibility.ts` | Unified visibility hook |
| `client/src/lib/commercial/clientGateRegistry.ts` | Machine-readable gate registry |
| `client/src/components/commercial/CommercialGateConsolidationDiagnostics.tsx` | Diagnostics UI |
| Expanded `featureVisibility.ts` | `isCanonicalCurrentPlan`, `getSubscriptionExpiryWarning`, panel/upgrade helpers |

## Safety Verification

| Constraint | Status | Evidence |
|---|---|---|
| No mutation blocking | ✅ | No `disabled` on save/export mutations added; Excel buttons unchanged |
| No router changes | ✅ | No route guards or redirects added |
| No billing changes | ✅ | Checkout still passes `planId`; `getCurrentSubscription` retained for billing display fallback |
| No server enforcement | ✅ | No server files modified; `commercial.getEntitlements` read-only |

## Tests

- `client/src/lib/commercial/featureVisibility.test.ts` — plan states + PG-1C.3C helpers
- `client/src/lib/commercial/clientGateRegistry.test.ts` — zero legacy gates, progress stats

Run:

```bash
npx vitest run client/src/lib/commercial
npx tsc --noEmit
```

## Success Criteria

- [x] Client-side commercial visibility decisions originate from unified authority path
- [x] No runtime enforcement changes
- [x] Legacy `isAdmin` duplicate removed from customizers (admin handled in `hasCommercialFeature`)
- [x] Diagnostics page shows consolidation progress at `/commercial/diagnostics`
