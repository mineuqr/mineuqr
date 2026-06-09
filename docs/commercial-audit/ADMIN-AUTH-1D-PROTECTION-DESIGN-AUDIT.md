# ADMIN-AUTH-1D — Protection Design Audit

**Date:** 2026-06-09  
**Prerequisite:** ADMIN-AUTH-1B (classification), ADMIN-AUTH-1C (commercial exclusion)

---

## Problem

Prior protection used hardcoded `PROTECTED_USER_IDS = [1]` in `shared/const.ts`. This:

- Coupled protection to database primary key, not platform identity
- Duplicated client checks (`isProtectedUserId`) separate from server authority
- Did not align with `ENV.ownerOpenId` as documented platform owner signal

---

## Single source of truth

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Server detection | `server/platformAccount.ts` | `ENV.ownerOpenId` matching via `getUserById` |
| Shared types | `shared/platformAccount.ts` | Client-safe `isProtectedPlatformAccountUser()` |
| Enforcement | `server/db/cascadeDeletes.ts` | Delete / role / classification / admin password-reset guards |
| API surface | `server/routers.ts` | tRPC mutations call async guards before writes |
| Bootstrap | `server/db.ts` `upsertUser` | Owner openId → `role=admin`, `accountClassification=INTERNAL` |
| Admin payloads | `sanitizeUserForAdminResponse` | Adds `isProtectedPlatformAccount: boolean` |

```text
ENV.ownerOpenId
      ↓
isPlatformAccountOpenId(openId)
      ↓
isPlatformAccountUserId(userId)  ← async lookup
      ↓
assertUserDeletable / assertProtectedUserRoleModifiable / assertProtectedUserClassificationModifiable
```

---

## Protection matrix

| Operation | Platform account | Enforcement |
|-----------|------------------|-------------|
| Delete user | **Blocked** | `deleteUserCascade` → `assertUserDeletable` |
| Role change (incl. downgrade) | **Blocked** | `admin.updateUserRole`, `profile.updateUserRole` |
| Classification change | **Blocked** | `admin.updateAccountClassification` |
| Admin password reset | **Blocked** | `admin.resetSubscriberPassword` |
| Self password change | **Allowed** | `profile.changePassword` (no guard) |
| View / login / normal usage | **Allowed** | No mutation guards |
| Commercial population | **Excluded** | `INTERNAL` + ADMIN-AUTH-1C CRS filter |

---

## UI safety (convenience)

| Surface | Behavior |
|---------|----------|
| `AdminManagement.tsx` | Hide edit role + delete for `isProtectedPlatformAccount` |
| `Users.tsx` | Hide edit + delete actions |
| `SuperAdminDashboard.tsx` | Hide delete button |

Server guards remain authoritative if UI is bypassed.

---

## Explicit non-changes

- No super-owner hierarchy
- No authorization redesign (`role` still gates admin APIs)
- No subscription / commercial / tenancy changes
- No special platform commercial plan
