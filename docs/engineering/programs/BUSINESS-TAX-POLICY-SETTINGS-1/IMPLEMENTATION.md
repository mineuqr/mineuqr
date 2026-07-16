# BUSINESS-TAX-POLICY-SETTINGS-1 — Implementation

**Date:** 2026-07-16  

---

## 1. Delivered surface

| Path | Role |
|------|------|
| `client/src/components/RestaurantSettingsSections.tsx` | `RestaurantFinancialPolicySection` UI |
| `client/src/lib/businessTaxPolicySettings.ts` | Rate validation, taxPolicy builder, country suggestions |
| `client/src/pages/Dashboard.tsx` (`SettingsTab`) | Load / suggest / save via `restaurant.update` |
| `client/src/lib/__tests__/businessTaxPolicySettings.test.ts` | Unit tests |
| `client/src/lib/__tests__/businessTaxPolicySettings.architecture.guards.test.ts` | Architecture guards |

---

## 2. Field mapping

| UI control | API / storage |
|------------|----------------|
| Apply Tax toggle | `taxEnabled` |
| Tax Rate (%) | `taxPolicy.components[0].ratePercent` → `taxPolicyJson` |
| Prices Include Tax | `taxMode = "inclusive"` |
| Prices Exclude Tax | `taxMode = "exclusive"` |

Rate validation: `0–100`, decimals allowed. Empty components when no rate.

---

## 3. Country suggestion UX

On country change in Settings:

1. Queue `getCountryFinancialPolicySuggestion(countryCode)` (SA / AE today).
2. Show banner with Apply / Dismiss.
3. Apply writes into local form state only; Save persists via existing API.

Never auto-mutates tax fields on country change.

---

## 4. Explicit non-changes

- `restaurant.update` already accepted tax fields — reused as-is  
- Check snapshot capture path unchanged  
- Reporting continues to use Check Currency / Tax Policy Snapshots  
- No migrations / schema changes  

---

## 5. Integration notes

- New Checks capture live Business Settings at create time.  
- Existing Checks remain immutable.  
- Dashboard KPI Reporting remains on `reporting.*` snapshot contracts.  
