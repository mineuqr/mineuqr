# LIVE-PLAN-CAPABILITY-MAPPING.md

Source chain (unchanged ownership):

Discovery → Commercial Projection → Presentation overlay → Live Plan bundle

Bootstrap: `projectionFeatureKeysForBridgePlan` =

1. `listProjectionIdsForCommercialPlan` (Projection eligibility per plan)  
2. `applyCommercialPresentationRules` (foundation printing/realtime; ordering ⇒ settlement bundle; kitchen/waiter/kiosk ⇒ devices; expo not auto-enabled)

No invented capability IDs. Legacy keys such as `qrMenu` are not stored on bundles.

| Plan | Projection seed | Presentation effect |
|------|-----------------|---------------------|
| Basic | `ordering` | + printing, realtime, settlement bundle (`checkManagement`, `splitPayment`, `multiCheckAllocation`, `refund`) |
| Professional | ordering, checkManagement, waiter, kiosk, reporting, kitchen, printing, devices, counterPickup | + realtime, remaining settlement keys, devices if not already set |
| Enterprise | all 15 Projection IDs | foundation already included; expo remains only because Enterprise seed is ALL |

Exact included keys after bootstrap are asserted equal to `projectionFeatureKeysForBridgePlan` in TEST D (`commercialLivePlans.cleanReset.test.ts`).

Limits from `PLAN_LIMITS` / `getLimitsForPlan`:

| Plan | restaurants | categories | items |
|------|-------------|------------|-------|
| Basic | 1 | 10 | 100 |
| Professional | 5 | 25 | 500 |
| Enterprise | null | null | null |
