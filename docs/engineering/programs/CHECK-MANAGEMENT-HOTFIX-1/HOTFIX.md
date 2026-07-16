# CHECK-MANAGEMENT-HOTFIX-1 — Surgical Regression Fix

**Classification:** Surgical Regression Fix  
**Date:** 2026-07-16  
**Parent program:** CHECK-MANAGEMENT-ARCHITECTURE-1  
**Forensics:** CHECK-MANAGEMENT-REGRESSION-FORENSICS-1  

---

## Root cause

Migration `0069_check_management` created DB column `restaurants.taxMode`.  
Drizzle schema declared `mysqlEnum('tax_mode', ...)`, so generated SQL selected/updated `` `tax_mode` ``.

`restaurant.list` failed; Dashboard empty-state masked the error as “No restaurants yet”.

---

## Fix

**File:** `drizzle/schema.ts`  
**Change only:**

```diff
- taxMode: mysqlEnum('tax_mode', ['inclusive', 'exclusive']).default('exclusive').notNull(),
+ taxMode: mysqlEnum('taxMode', ['inclusive', 'exclusive']).default('exclusive').notNull(),
```

Aligns Drizzle mapping with the existing production column. No migration. No DB rename. No architecture changes.

---

## Out of scope (explicitly not changed)

- Migrations / journal
- Database columns
- Check / Session / Runtime architecture
- Dashboard architecture
- `restaurant.update` API contract (unchanged; mapping now works)
