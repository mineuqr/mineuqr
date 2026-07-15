# WAITER-SCREEN-IDENTITY-PRESENTATION-1 — Architecture

**Status:** Implemented  
**Date:** 2026-07-16  
**Type:** Presentation Adoption  

---

## 1. Objective

Expose Screen Identity in Waiter UI without changing Business Identity ownership.

| Signal | Source (Runtime Public API) | Meaning |
|--------|-----------------------------|---------|
| Business name | `useRuntimeBusiness().businessName` | Restaurant / Business Identity |
| Screen name | `useRuntimeIdentity().displayIdentity` | Physical device from Screen Management |
| Role label | `useRuntimeRole().role` → `screenTypeLabel` | Optional role chrome |

---

## 2. Flow

```
Screen Runtime Public APIs
  → WaiterRolePresentation (forward only)
  → WaiterShell activation props
  → WaiterScreenIdentityHeader / workspace chrome
```

No identity derivation in presentation. No Runtime / Platform changes.

---

## 3. Non-goals

- No Business Identity redesign  
- No DTO / provider / materializer changes  
- Dashboard `/waiter` unchanged (no Screen Identity props)  
