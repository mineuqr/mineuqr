# ADMIN-AUTH-1B — Account Classification Backfill Report

**Date:** 2026-06-09  
**Migration:** `drizzle/0020_account_classification.sql`  
**Status:** Ready for deployment

---

## Migration steps

| Step | SQL | Idempotent |
|------|-----|------------|
| 1 | `ADD accountClassification ENUM(...) NOT NULL DEFAULT 'COMMERCIAL'` | No — column add runs once |
| 2 | `UPDATE ... SET INTERNAL WHERE role='admin' AND classification='COMMERCIAL'` | Yes — safe to re-run |

---

## Backfill rules applied

| Existing cohort | `role` | Assigned `accountClassification` |
|-----------------|--------|----------------------------------|
| Customer accounts | `user` | `COMMERCIAL` (column default) |
| Platform operators | `admin` | `INTERNAL` (includes `ENV.ownerOpenId`) |
| Service / automation | any | `COMMERCIAL` (until positively identified and assigned `SYSTEM` later) |

---

## Validation queries (post-migration)

```sql
-- All users must have explicit classification
SELECT COUNT(*) FROM users WHERE accountClassification IS NULL;
-- Expected: 0

-- Admin operators classified as internal
SELECT id, email, role, accountClassification
FROM users WHERE role = 'admin';
-- Expected: accountClassification = 'INTERNAL'

-- Customer accounts remain commercial
SELECT COUNT(*) FROM users WHERE role = 'user' AND accountClassification = 'COMMERCIAL';
-- Expected: total role=user count (at migration time)

-- No SYSTEM accounts unless manually assigned after migration
SELECT COUNT(*) FROM users WHERE accountClassification = 'SYSTEM';
-- Expected: 0 (initial)
```

---

## Audit

- Schema change recorded in Drizzle journal `0020_account_classification`
- Runtime classification changes logged via `OPS_EVENT.account_classification_changed`
- Internal user creation logged via `OPS_EVENT.internal_user_created`

---

## Commercial metrics impact

**None in ADMIN-AUTH-1B.**

Classification is persisted and exposed in admin APIs/UI only. Commercial Overview, exports, and analytics population filtering is **ADMIN-AUTH-1C**.

---

## Rollback note

Rollback requires dropping `users.accountClassification` column. Not automated — coordinate with DBA if needed.
