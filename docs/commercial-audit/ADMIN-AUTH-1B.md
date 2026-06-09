# ADMIN-AUTH-1B — Internal Staff Accounts

**Date:** 2026-06-09  
**Status:** Complete  
**Prerequisite:** [ADMIN-AUTH-1A](./ADMIN-AUTH-1A.md)  
**Next:** ADMIN-AUTH-1C Commercial Analytics Exclusion

---

## Deliverables

| # | Item | Location |
|---|------|----------|
| 1 | Schema | `drizzle/schema.ts` — `users.accountClassification` |
| 2 | Migration | `drizzle/0020_account_classification.sql` |
| 3 | Backfill report | [ADMIN-AUTH-1B-BACKFILL-REPORT.md](./ADMIN-AUTH-1B-BACKFILL-REPORT.md) |
| 4 | Domain types | `shared/accountClassification.ts` |
| 5 | Internal user creation | `server/createInternalUser.ts`, `admin.createInternalUser` |
| 6 | Management APIs | `admin.listAllUsers` filter, `admin.updateAccountClassification`, `getOwnerOverviewList` filter |
| 7 | UI | `AdminManagement.tsx` — badge, filter, create dialog, edit classification |
| 8 | Tests | `server/admin-auth-1b.test.ts` |

---

## API summary

| Procedure | Purpose |
|-----------|---------|
| `admin.createInternalUser` | Create INTERNAL staff (marketing/sales/support/operations) |
| `admin.updateAccountClassification` | Admin-only classification change (audited) |
| `admin.listAllUsers` | Optional `classificationFilter` |
| `admin.getOwnerOverviewList` | Optional `classificationFilter`; returns `accountClassification` |

---

## Explicit non-changes (ADMIN-AUTH-1C scope)

- `CommercialReadService.getAllOwnerCommercialStates` — **unchanged**
- `CanonicalMetricsService` / Commercial Overview — **unchanged**
- `CommercialReportService` / exports / analytics — **unchanged**

Classification is persisted and manageable; commercial population filtering follows in **ADMIN-AUTH-1C**.

---

## Exit criteria

| Criterion | Status |
|-----------|--------|
| `accountClassification` on users | ✅ |
| Backfill documented | ✅ |
| Internal staff creation | ✅ |
| Classification auditable | ✅ |
| Tests pass | ✅ |
| Commercial metrics unchanged | ✅ |
