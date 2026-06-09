# ADMIN-AUTH-1D — Production Impact Assessment

**Date:** 2026-06-09  
**Environment:** Production (`OWNER_OPEN_ID` configured)

---

## Behavioral change

| Area | Before | After |
|------|--------|-------|
| Protection key | Hardcoded user id `1` | `ENV.ownerOpenId` → resolved user |
| Client detection | `isProtectedUserId(1)` | `isProtectedPlatformAccount` API flag |
| Server detection | ID array in `shared/const.ts` | `server/platformAccount.ts` |

---

## Production account (expected)

The platform owner account matching `OWNER_OPEN_ID`:

- `role = admin` (authorization)
- `accountClassification = INTERNAL` (commercial exclusion per ADMIN-AUTH-1C)
- Protected from delete, role demotion, classification change

If production owner user id is `1` and `OWNER_OPEN_ID` matches that user's `openId`, behavior is **equivalent** to the prior hardcoded guard.

---

## Risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Wrong `OWNER_OPEN_ID` env | Medium | Login/upsert still elevates matching openId; protection follows env |
| Missing `OWNER_OPEN_ID` | Low | No user matches → no platform protection active |
| UI bypass | None | Server guards authoritative |
| Commercial regression | None | No CRS / metrics changes in this phase |

---

## Deployment requirements

1. Confirm `OWNER_OPEN_ID` matches production platform account `openId`
2. Confirm that account has `accountClassification = INTERNAL` (migration 0020)
3. No schema migration required for ADMIN-AUTH-1D

---

## Rollback

Revert to `PROTECTED_USER_IDS = [1]` in `shared/const.ts` and sync guards — low risk rollback if env-based detection misconfigured.
