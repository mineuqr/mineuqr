# BUSINESS-IDENTITY-REMEDIATION-1 — Implementation

## 1. Summary

Historic business-identity assignment failed during production order-read backfill because `resolveBusinessDayWindow` produced **host-timezone-dependent** UTC bounds. On `Asia/Riyadh` operator hosts the window ended three hours early, so afternoon orders for a long Friday-open business day fell outside the rank window and competed for the same `daily_display_number`.

## 2. Root Cause

`localWallToUtcIso` used `new Date(timezoneLessIso)` (host-local) then subtracted the restaurant offset again → truncated windows. See `ARCHITECTURE.md`.

## 3. Files Changed

| File | Change |
|------|--------|
| `shared/utils/businessDay.ts` | Host-independent `localWallToUtcIso` (UTC guess + refine) |
| `server/order/business-identity/application/__tests__/businessDay.test.ts` | Absolute ISO pins + Friday 23:45 fixture |
| `docs/engineering/programs/BUSINESS-IDENTITY-REMEDIATION-1/*` | Forensics + implementation |

## 4. Remediation

No production SQL edits. No allocator bypass. Fix shared window math; rematerialize via official `pnpm db:order-read:backfill`.

## 5. Validation

| Check | Result |
|-------|--------|
| businessDay unit + identity architecture tests | **19/19 Pass** |
| Production `pnpm db:order-read:backfill` | **completed** — `rowsProcessed: 262`, `lastError: null` |
| Order `1890001` | `2026-06-11` / **#11** (unchanged, chronologically correct) |
| Order `1890002` | `2026-06-11` / **#12** (assigned on retry path success) |
| Null business identities | **0** |
| Duplicate `(restaurantId, businessDay, daily_display_number)` | **0** |
| Tenant isolation | Only restaurant `720007` historical cohort · no cross-tenant rows |

## 6. Certification

**CERTIFIED** — BUSINESS-IDENTITY-REMEDIATION-1.

Root cause was host-dependent business-day window conversion. Shared math is fixed; official rematerialize rebuilt identities and the Order Read Model without manual SQL or allocator bypass.