# ADMIN-AUTH-1D — Protected Platform Account

**Date:** 2026-06-09  
**Status:** Complete

---

## Objective

Operational protection for the MineuQR platform account identified by `ENV.ownerOpenId` (`OWNER_OPEN_ID`).

---

## Implementation

### D.1 Platform account detection

**New files:**

- `server/platformAccount.ts` — server SSoT
- `shared/platformAccount.ts` — types + client helper

**Refactored:**

- `server/db.ts` — `upsertUser` uses `isPlatformAccountOpenId()` instead of inline `ENV.ownerOpenId`
- `sanitizeUserForAdminResponse` — adds `isProtectedPlatformAccount`

**Deprecated:**

- `PROTECTED_USER_IDS` / `isProtectedUserId` in `shared/const.ts`

### D.2 Delete protection

`deleteUserCascade` → async `assertUserDeletable` → `ProtectedUserDeleteError`

Wired in: `admin.deleteUser`, `profile.deleteUser`

### D.3 Role downgrade protection

`assertProtectedUserRoleModifiable` blocks **any** role mutation on platform account.

Wired in: `admin.updateUserRole`, `profile.updateUserRole`

### D.4 Classification protection

`assertProtectedUserClassificationModifiable` blocks classification changes.

Platform account remains `INTERNAL` (set on upsert); cannot become `COMMERCIAL` → cannot enter commercial population.

Wired in: `admin.updateAccountClassification`

### D.5 UI safety

Client uses `isProtectedPlatformAccountUser(u)` from API flag instead of hardcoded user id.

`AdminOwnerOverview.owner` includes `isProtectedPlatformAccount`.

### D.6 Tests

| File | Coverage |
|------|----------|
| `server/platformAccount.test.ts` | openId detection, userId resolution |
| `server/db/cascadeDeletes.test.ts` | assert helpers |
| `server/admin-auth-1d.test.ts` | tRPC delete / role / classification enforcement |

---

## Related docs

- [ADMIN-AUTH-1D-PROTECTION-DESIGN-AUDIT.md](./ADMIN-AUTH-1D-PROTECTION-DESIGN-AUDIT.md)
- [ADMIN-AUTH-1D-TEST-COVERAGE.md](./ADMIN-AUTH-1D-TEST-COVERAGE.md)
- [ADMIN-AUTH-1D-PRODUCTION-IMPACT.md](./ADMIN-AUTH-1D-PRODUCTION-IMPACT.md)
- [ADMIN-AUTH-1D-COMPLETION-REPORT.md](./ADMIN-AUTH-1D-COMPLETION-REPORT.md)
