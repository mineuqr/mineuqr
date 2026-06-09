# ADMIN-AUTH-1E — Test Coverage Summary

**Date:** 2026-06-07

---

## New tests

### `server/admin-auth-1e.test.ts` (5)

| Test | Validates |
|------|-----------|
| `cannot_create_subscription_for_platform_account` | `admin.createUserSubscriptionByAdmin` → `BAD_REQUEST`; `createSubscriptionForRestaurant` not called |
| `cannot_update_subscription_for_platform_account` | `admin.updateUserSubscriptionByAdmin` → `BAD_REQUEST`; `updateSubscriptionById` not called |
| `cannot_delete_subscription_for_platform_account` | `admin.deleteUserSubscriptionByAdmin` → `BAD_REQUEST`; `deleteSubscriptionCascade` not called |
| `cannot_generate_invoice_for_platform_account` | `admin.generateInvoicePDF` → `BAD_REQUEST` |
| `allows subscription mutations for non-platform users` | Non-platform update succeeds |

All tests exercise public tRPC mutation paths — not internal helpers only.

### `server/db/cascadeDeletes.test.ts` (updated)

| Test | Validates |
|------|-----------|
| `assertProtectedUserSubscriptionModifiable throws for platform account` | Helper blocks platform userId; allows others |

---

## UI coverage (manual / integration)

| Surface | Expected behavior |
|---------|-------------------|
| `AdminManagement.tsx` `renderUserActions()` | `secondary` hidden when `isProtectedPlatformAccountUser(u)` |

No automated client test added — consistent with ADMIN-AUTH-1D (server enforcement is authoritative).

---

## Verification

```text
npm run check  PASS
npm test       PASS
```
