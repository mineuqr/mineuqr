# BUSINESS-TAX-POLICY-SETTINGS-1 — Architecture

**Classification:** Business Settings Capability  
**Status:** Approved for implementation → PRODUCTION CERTIFIED target  
**Date:** 2026-07-16  
**Depends on:** CHECK-MANAGEMENT-ARCHITECTURE-1, REPORTING-PLATFORM-ARCHITECTURE-1  
**Does not redesign:** Order Domain, Operational Session, Check Management, Reporting Platform, Runtime, Order Read, Business Identity  

---

## 1. Objective

Expose the certified Business Tax Policy capability through Restaurant Settings Management UI.

Business Settings remain the single owner of:

- Country  
- Currency  
- Tax Policy (`taxEnabled`, `taxMode`, `taxPolicyJson`)

---

## 2. UI placement

```
Dashboard → Restaurant Settings
  → Country
  → Currency
  → Financial Policy   ← NEW
       → Apply Tax (taxEnabled)
       → Tax Rate % (taxPolicyJson.components[].ratePercent)
       → Pricing Mode (taxMode: inclusive | exclusive)
```

---

## 3. Ownership boundaries

| Concern | Owner |
|---------|--------|
| Live tax / currency / country config | Business Settings (`restaurants`) |
| Immutable tax / currency at Check create | Check Management (snapshots) |
| Report tax / currency context | Reporting Platform (Check snapshots only) |
| Settings presentation | Dashboard Restaurant Settings |

Changing Business Settings affects **new Checks only**. Existing Checks keep frozen snapshots.

Reporting must never read current Business Settings for KPI tax/currency context.

---

## 4. Persistence

Use existing `restaurant.update`:

- `taxEnabled` → column  
- `taxMode` → column (`inclusive` | `exclusive`)  
- `taxPolicy` → serialized into `taxPolicyJson` (no new column)

No migrations. No schema redesign.

---

## 5. Country suggestions

When Country changes, UI **may** offer defaults (e.g. SA 15% inclusive, AE 5% inclusive).

Suggestions are opt-in. Never overwrite existing tax configuration automatically.

---

## 6. Non-goals

- No Check / Reporting / Order / Runtime changes  
- No automatic rewrite of existing Checks  
- No country hard-coding inside Check Management or Reporting Platform  
