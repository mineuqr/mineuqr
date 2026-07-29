# Lifecycle Model — Deliverable 6

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Canonical states

```
Draft
  → Trial
    → Active
      ⇄ Grace
      → Suspended
      → Expired
      → Cancelled
        → Archived
```

| State | Commercial meaning |
|-------|-------------------|
| **Draft** | Subscription record prepared; not commercially enabling |
| **Trial** | Time-bounded trial entitlements |
| **Active** | Paid/contract entitlements in force |
| **Grace** | Temporary continuation after payment/renewal issue (policy) |
| **Suspended** | Entitlements blocked (non-grace) |
| **Expired** | Term ended without renewal |
| **Cancelled** | Explicit end by customer/platform policy |
| **Archived** | Historical; no commercial enablement |

---

## 2. Legal transitions (summary)

| From | To | Notes |
|------|-----|-------|
| Draft | Trial / Active | Activation |
| Draft | Cancelled / Archived | Abort |
| Trial | Active | Conversion / upgrade |
| Trial | Expired / Cancelled | No convert |
| Active | Grace | Renewal/payment signal (billing OOS) |
| Grace | Active | Recovered |
| Grace | Suspended / Expired / Cancelled | Grace exhausted |
| Active | Suspended | Policy / risk / non-pay |
| Suspended | Active | Recovery |
| Active / Suspended / Expired | Cancelled | End |
| Cancelled / Expired | Archived | Retention |
| * | Draft | Forbidden from terminal commercial states |

---

## 3. Renewal · Upgrade · Downgrade · Plan migration

| Action | Effect |
|--------|--------|
| **Renewal** | Extends Active (or recovers Grace→Active); plan key usually unchanged |
| **Upgrade** | Move to richer plan key; entitlements expand per catalog |
| **Downgrade** | Move to lesser plan; excess resources may enter grace/read-only/block per policy |
| **Plan migration** | Controlled change of plan key + limit bindings; audited; domains not consulted for commercial rules |

Lifecycle transitions **do not** change Tenant Identity or lineage.

Plan changes mid-flight do **not** alter already executing long-running operations that hold an entitlement snapshot (**SP-18**).

---

## 4. Recovery

| Scenario | Policy |
|----------|--------|
| Grace → Active | Standard on successful renewal signal |
| Suspended → Active | Platform/CS policy + audit |
| Expired → Active | Requires new subscription/activation path |
| Cancelled → Active | New subscription instance preferred (history preserved) |

---

## 5. Entitlement coupling

| State | Default entitled? |
|-------|-------------------|
| Draft | No |
| Trial | Trial feature set |
| Active | Plan + add-ons |
| Grace | Policy subset or full (configurable) |
| Suspended / Expired / Cancelled / Archived | No (unless explicit read-only catalog exceptions) |
