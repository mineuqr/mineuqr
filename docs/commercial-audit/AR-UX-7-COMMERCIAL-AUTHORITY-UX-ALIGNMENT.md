# AR-UX-7 — Commercial Authority UX Alignment

**Program:** Commercial Authority Program — Admin UX  
**Phase:** AR-UX-7 — Owner-centric subscription presentation  
**Date:** 2026-06-09  
**Status:** Complete  

**Context:** COMM-AUDIT-1A identified restaurant-card subscription actions that implied `Restaurant → Subscription` instead of `Owner → Subscription → Restaurants`.

**Mode:** UI alignment only. No CRS, metrics, entitlement, or database changes.

---

## 1. Executive Summary

Admin Operations (`/admin/operations`) now communicates the post-EXEC authority model:

```text
Owner Account → Account Subscription → Entitlements → Restaurants (inherit)
```

Restaurant cards no longer expose subscription create/edit/delete controls. Subscription management is consolidated in the **Users** section using owner-level APIs (`createUserSubscriptionByAdmin`, `updateUserSubscriptionByAdmin`, `deleteUserSubscriptionByAdmin`).

---

## 2. UX Audit Findings (AR-UX-7A)

### Restaurant-centric controls removed

| Location | Control | API (unchanged) | Action |
|----------|---------|-----------------|--------|
| `AdminManagement.tsx` restaurant cards | Activate Subscription | `createRestaurantSubscription` | **Removed** |
| Restaurant cards | Edit Subscription | `updateRestaurantSubscription` | **Removed** |
| Restaurant cards | Delete Subscription | `deleteRestaurantSubscription` | **Removed** |
| Restaurant cards | Reactivate Subscription | `updateRestaurantSubscription` | **Removed** |
| Restaurant-level dialogs | Delete/edit subscription confirm | restaurant-scoped mutations | **Removed** |
| Create Restaurant dialog | Bundled plan/billing/end date + auto `createRestaurantSubscription` | `createRestaurantSubscription` | **Removed from UI** |

### Owner-level controls retained (AR-UX-7B)

| Location | Control | API |
|----------|---------|-----|
| `UsersSection` in `AdminManagement.tsx` | Create Account Subscription | `admin.createUserSubscriptionByAdmin` |
| Users table/cards | Edit Account Subscription | `admin.updateUserSubscriptionByAdmin` |
| Users table/cards | Delete Account Subscription | `admin.deleteUserSubscriptionByAdmin` |
| Users table/cards | Generate invoice | `admin.generateInvoicePDF` |

### Deferred / out of scope

| Surface | Finding |
|---------|---------|
| `/users` orphan route | Role management only — no subscription controls (merges into tenants in EXEC-7D) |
| `/admin/commercial` | Read-only snapshot — no subscription actions (correct) |
| `/admin/tenants` | Placeholder — no subscription UI |
| Server `createRestaurantSubscription` etc. | Endpoints remain for backward compatibility; **no longer called from Admin UI** |

---

## 3. UI Alignment Changes

### AR-UX-7A — Restaurant cards

- **Actions:** Edit restaurant, Delete restaurant only
- **Read-only block:** “Owner entitlements (inherited)” with plan/status from `ownerCommercial` (CRS display)
- **Hint:** Subscription managed in Users section

### AR-UX-7B — Owner-level presentation

- **Users section** is the sole subscription management surface in Operations
- Create dialog no longer requires restaurant picker — account-scoped create only (`restaurantId` omitted)
- **Restaurant count** column/badge on user rows (Owner → Subscription → **N restaurants**)

### AR-UX-7C — Relationship visibility

User rows now show:

```text
Owner identity
→ Account subscription status / plan / end date
→ Restaurant count
```

Restaurant cards show inherited entitlement summary (read-only), not a separate subscription entity.

### AR-UX-7D — Terminology

| Before | After |
|--------|-------|
| Restaurants & Subscriptions | Restaurants |
| Edit Subscription | Edit Account Subscription |
| Subscribe (generic) | Create Account Subscription |
| No subscription | No account subscription |
| enterRestaurantData (with subscription) | Restaurant-only create + hint to Users section |

Locales: `en.json`, `ar.json` — keys under `admin.*`

---

## 4. Files Modified

| File | Change |
|------|--------|
| `client/src/pages/AdminManagement.tsx` | Remove restaurant subscription actions; owner UX enhancements |
| `client/src/locales/en.json` | Owner-centric labels |
| `client/src/locales/ar.json` | Owner-centric labels (AR) |

---

## 5. Validation

```bash
pnpm run check
```

Manual checklist:

- [ ] Restaurant cards: no Activate / Edit / Delete subscription buttons
- [ ] Users section: create / edit / delete account subscription available
- [ ] Restaurant cards show inherited entitlements hint
- [ ] User rows show restaurant count
- [ ] Create restaurant dialog does not bundle subscription fields

---

## 6. Authority Invariants (unchanged)

- `CommercialReadService` — untouched
- `CanonicalMetricsService` — untouched
- Entitlement resolution — untouched
- Database — untouched

---

*Stop boundary: AR-UX-7 complete. Server-side retirement of restaurant-scoped admin mutations is a separate phase if desired.*
