# CAPABILITY-VALIDATION.md

Source chain (unchanged):

Discovery → Commercial Projection (`listProjectionIdsForCommercialPlan`) → Presentation overlay (`applyCommercialPresentationRules`) → Live Plan bundle.

No invented capability IDs. Legacy compatibility keys such as `qrMenu` are **not** stored on bundles.

## Included keys on production Live Plans

| Plan | Count | Keys |
|------|------:|------|
| Basic | 7 | `ordering`, `printing`, `realtime`, `checkManagement`, `splitPayment`, `multiCheckAllocation`, `refund` |
| Professional | 13 | `ordering`, `checkManagement`, `waiter`, `kiosk`, `reporting`, `kitchen`, `printing`, `devices`, `counterPickup`, `realtime`, `splitPayment`, `multiCheckAllocation`, `refund` |
| Enterprise | 15 | all Projection IDs, including `expo` and `register` |

Total `commercial_bundle_features` rows: **35** (7+13+15). No duplicate `(bundleId, featureKey)`. No orphaned mappings.

## Approved corrections (intact)

| Area | Evidence |
|------|----------|
| Sessions & Tables | `ordering` on all three (Presentation/Projection) |
| Menu Management / Menu Design | not invented as extra catalog keys; remain outside Projection commercial SSOT |
| Smart QR | legacy `qrMenu` **absent** from bundles |
| Kitchen | Professional + Enterprise |
| Waiter | Professional + Enterprise |
| Kiosk | Professional + Enterprise |
| Expo | **Enterprise only** (seed is ALL); Professional does not include it |
| Register / Shift Management | **Enterprise only** (`register`) |
| Financial Settlement | Presentation overlay: `checkManagement`, `splitPayment`, `multiCheckAllocation`, `refund` on all three |
| Reporting & Statistics | Professional + Enterprise (`reporting`) |
| Devices / Screens | Professional + Enterprise (`devices`); Presentation may add devices for kitchen/waiter/kiosk |
| Printing | foundational — all three |

## Explicitly excluded

- Experimental / governance-only / planned IDs not in `COMMERCIAL_PROJECTION_IDS`
- Deprecated legacy compatibility keys as commercial SSOT
- Professional does **not** receive `register` or `expo`

Limits from `PLAN_LIMITS` / `getLimitsForPlan` persisted:

| Plan | restaurants | categories | items |
|------|-------------|------------|-------|
| Basic | 1 | 10 | 100 |
| Professional | 5 | 25 | 500 |
| Enterprise | null | null | null |
