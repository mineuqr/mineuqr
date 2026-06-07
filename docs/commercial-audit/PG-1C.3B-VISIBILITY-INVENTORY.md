# PG-1C.3B — Visibility Inventory

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.3B — replace UI feature visibility with canonical entitlements  
**Date:** 2026-06-07  
**Mode:** Visibility only — no mutation enforcement, no router changes  

---

## 1. Summary

| Metric | Count |
|---|---:|
| Client visibility locations audited | 10 |
| Replaced with `entitlements.features` | 7 |
| Messaging-only (actions unchanged) | 2 |
| Server-driven (documented, not replaced) | 1 |

**Visibility source:** `useCommercialEntitlements()` → `entitlements.features.<key>`

---

## 2. Inventory

| # | File | Legacy logic | Feature key | Replacement | Status |
|---:|---|---|---|---|---|
| 1 | `TemplateSelector.tsx` | `isSubscribed = checkTrialStatus.isActive \|\| admin` | `templates` | `isPremiumTemplateLocked()` / `hasCommercialFeature(..., "templates")` | **Replaced** |
| 2 | `TemplateSelector.tsx` | `!isSubscribed` premium notice | `templates` | `shouldShowTemplatesUpgradeNotice()` | **Replaced** |
| 3 | `ColorCustomizer.tsx` | `canCustomizeColors = isSubscribed \|\| isAdmin` | `customColors` | `customColorsEnabled` prop from entitlements | **Replaced** |
| 4 | `FontCustomizer.tsx` | `canCustomizeFonts = isSubscribed \|\| isAdmin` | `customFonts` | `customFontsEnabled` prop from entitlements | **Replaced** |
| 5 | `Pricing.tsx` | `checkTrialStatus.isActive` trial banner | `commercial.isTrial` | `isTrialActiveForMessaging()` + context `trialEndsAt` | **Replaced** |
| 6 | `Dashboard.tsx` (`RestaurantDetail`) | `getByRestaurant` expiry warning | `commercial.plan` | `CommercialContext` period dates | **Replaced** |
| 7 | `Dashboard.tsx` (`ReportsTab`) | Ungated reports section | `reports` | `CommercialUpgradeBanner` (messaging) | **Messaging only** |
| 8 | `Dashboard.tsx` (`ReportsTab`) | Ungated Excel buttons | `excelExport` | Upgrade label on button (export still works) | **Messaging only** |
| 9 | `SubscriptionManagement.tsx` | `plan.nameAr` only | `commercial.plan` | `CommercialPlanName` canonical badge | **Messaging only** |
| 10 | `MenuView.tsx` | `order.canOrder` (server) | `ordering` | Unchanged — server authority | **Server-driven** |

---

## 3. Out of scope (intentionally unchanged)

| Area | Reason |
|---|---|
| Server `routers.ts` gates | PG-1C.3B restriction — no router changes |
| `order.canOrder` / `order.create` | Server enforcement unchanged |
| Admin `planId` form fields | Operational admin tooling, not owner feature visibility |
| `MenuTemplates.tsx` `isPremium` catalog | Metadata for template tier; lock driven by `templates` feature |
| Mutation `disabled={isLocked}` on templates | Pre-existing UX; lock source changed, not new enforcement |

---

## 4. Plan visibility differences (canonical)

| Plan | `templates` UI | `customColors/Fonts` UI | `reports` messaging | `excelExport` label |
|---|:---:|:---:|:---:|:---:|
| NONE | Locked + notice | Locked panel | Upgrade banner | Upgrade label |
| BASIC | Unlocked | Locked panel | Upgrade banner | Upgrade label |
| TRIAL | Unlocked | Unlocked | No banner | No label |
| PROFESSIONAL | Unlocked | Unlocked | No banner | No label |
| ENTERPRISE | Unlocked | Unlocked | No banner | No label |
| ADMIN | Unlocked | Unlocked | No banner | No label |

**Note:** Basic users may see stricter **visibility** than legacy `isSubscriptionActive` for colors/fonts (aligns with PG-1C.2D AD-3). Server mutations unchanged until Wave 2 enforcement.

---

## 5. Diagnostics

`/commercial/diagnostics` includes **Visibility decisions (Wave 1)** table via `CommercialVisibilityDiagnostics` — maps each inventory row to current entitlement resolution.

---

## 6. Code references

- Visibility helpers: `client/src/lib/commercial/featureVisibility.ts`
- Inventory export: `UI_VISIBILITY_INVENTORY` in same file
- Tests: `client/src/lib/commercial/featureVisibility.test.ts`

---

*Visibility only. No authority enforcement.*
