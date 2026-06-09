# ADMIN-AUTH-1D — Test Coverage Summary

**Date:** 2026-06-09

---

## New tests

### `server/platformAccount.test.ts` (3)

- `getPlatformOwnerOpenId` returns mocked `ENV.ownerOpenId`
- `isPlatformAccountOpenId` true/false cases
- `isPlatformAccountUserId` resolves via `getUserById`

### `server/admin-auth-1d.test.ts` (6)

| Test | Validates |
|------|-----------|
| Platform openId detection | SSoT helpers |
| Platform userId resolution | Async lookup |
| Block delete | `assertUserDeletable` + `admin.deleteUser` → TRPCError |
| Block role change | `assertProtectedUserRoleModifiable` + `admin.updateUserRole` |
| Block classification | `assertProtectedUserClassificationModifiable` + `admin.updateAccountClassification` |
| Allow non-platform mutations | Other users can update role/classification |

### `server/db/cascadeDeletes.test.ts` (updated, 5)

- Platform account blocked for delete, role, classification, password reset
- Non-platform user deletable
- Subscription cascade unchanged

---

## Updated tests

| File | Change |
|------|--------|
| `server/admin-auth-1b.test.ts` | Async classification guard + ENV mock |

---

## Verification

```text
npm run check  PASS
npm test       PASS
```

Server-side enforcement validated in tRPC layer — not UI-only.
