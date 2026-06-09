# ADMIN-AUTH-1C — Population Audit

**Date:** 2026-06-09  
**Phase:** A (read-only)  
**Migration:** `drizzle/0020_account_classification` (applied)  
**Prerequisite:** [ADMIN-AUTH-1B](./ADMIN-AUTH-1B.md)

---

## Classification inventory

Query:

```sql
SELECT
  accountClassification,
  COUNT(*) AS count
FROM users
GROUP BY accountClassification;
```

### Production result (verified pre-1C)

| Classification | Count |
| -------------- | ----- |
| COMMERCIAL     | 1     |
| INTERNAL       | 1     |
| SYSTEM         | 0     |
| **Total users**| **2** |

---

## Population breakdown

| Cohort | Count | Notes |
|--------|-------|-------|
| Total users | 2 | All `users` rows |
| Total owners (commercial pipeline candidates, pre-1C) | 2 | `getAllUsers()` — no filter |
| Total internal users | 1 | `accountClassification = INTERNAL` (`role = admin`, backfilled by 0020) |
| Total system users | 0 | No `SYSTEM` accounts assigned |
| Total commercial users | 1 | `accountClassification = COMMERCIAL` |

---

## Pre-1C commercial pipeline behavior

Before ADMIN-AUTH-1C, `CommercialReadService.getAllOwnerCommercialStates()` called `getAllUsers()` with **no classification filter**. Both users entered the certified commercial pipeline:

| User | `role` | `accountClassification` | Pre-1C pipeline |
|------|--------|---------------------------|-----------------|
| Platform operator | `admin` | `INTERNAL` | **Included** via `role === "admin"` → `ADMIN` plan |
| Customer owner | `user` | `COMMERCIAL` | **Included** via subscription resolution |

---

## Post-1C target population

| Classification | Commercial KPI population |
| -------------- | ------------------------- |
| COMMERCIAL | **Included** |
| INTERNAL | **Excluded** |
| SYSTEM | **Excluded** |

Single authority boundary: `CommercialReadService.getAllOwnerCommercialStates()` with `classificationFilter: "COMMERCIAL"`.

---

## Validation queries (post-1C deployment)

```sql
-- Commercial population size
SELECT COUNT(*) FROM users WHERE accountClassification = 'COMMERCIAL';
-- Expected: 1

-- Internal staff excluded from commercial metrics
SELECT COUNT(*) FROM users WHERE accountClassification = 'INTERNAL';
-- Expected: 1 (visible in admin UI, not in commercial KPIs)

-- No unclassified users
SELECT COUNT(*) FROM users WHERE accountClassification IS NULL;
-- Expected: 0
```
