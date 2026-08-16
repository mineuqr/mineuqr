# FINAL REPORT

**PROGRAM:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1 (G-11)  
**STATUS:** PASS — POLICY B CONFIRMED; MINIMAL occupancyDelta=0 CLARIFICATION  
**POLICY DECISION:** **B** — downgrade does not mutate existing resources. Existing occupancy may exceed the new cap. New capacity-consuming mutations (`occupancyDelta = 1`) are rejected when `proposedTotal > effectiveCap`.  
**EXISTING RESOURCE POLICY:** Remain valid and operational. No freeze, hide, auto-deactivate, or auto-delete.  
**NEW CAPACITY POLICY:** `COUNT(*) + 1` vs `checkLimit()`. Denied while occupancy ≥ new cap. Permitted when `occupancy + 1 <= cap`.  
**RESOURCE MATRIX:** restaurants / categories / items / posTerminals as in `RESOURCE-BEHAVIOR-MATRIX.md`. staffAccounts / branches / devices / screens: no live occupancy; not invented.  
**REACTIVATION POLICY:** Catalog/restaurant flag flip is not a new slot (G-10). POS deactivated→provisioned consumes a slot and is subject to the current cap.  
**DELETE POLICY:** Always allowed. Reduces COUNT. No downgrade debt. Create unblocks only when live COUNT + delta passes `checkLimit`.  
**UPGRADE POLICY:** New cap applies immediately. Existing rows intact. No marker to clear.  
**POS POLICY:** G-10 occupancy set unchanged. Existing provisioned terminals keep operating. New provision / reactivate blocked at over-cap. Replace remains `occupancyDelta = 0` and is allowed at over-cap if entitled.  
**OWNER POLICY:** Same Commercial cap. No extra slots.  
**ADMIN POLICY:** Same helper / same cap (G-09).  
**PLATFORM_OWNER POLICY:** G-09 **B** — target tenant cap. FULL_PLATFORM unlimited is entitlement, not a role bypass.  
**PLAN CHANGE OWNER:** Commercial (`bindSubscriptionToLivePlan` / `saveLive` / `resolveOwnerEntitlements` → `checkLimit`). POS / orders / dashboard do not own caps.  
**PLAN CHANGE ATOMICITY:** Binding or `saveLive` is the plan write. Limits resolve on read. Occupancy txn does not lock the plan row. Decide-time cap is the accepted boundary.  
**CONCURRENT DOWNGRADE/CREATE RESULT:** Create may observe the old cap if `decide()` ran before the new cap committed. Occupancy never exceeds the old cap. Occupancy may exceed the new cap (Policy B leftover). Sequential TiDB: downgrade-then-create rejected; create-then-downgrade occupancy 2 > cap 1. Overlap run: occupancy 1, create rejected.  
**TIDB RESULT:** 15/15 PASS. Engine 8.0.11-TiDB-v8.5.3-serverless. Identity ACCEPT_NON_PRODUCTION.  
**G-07 RESULT:** P8 PASS (`finalOccupancy: 2`)  
**G-08 RESULT:** P12 PASS (`orphanCategories: 0`)  
**G-09 RESULT:** owner∥admin PASS (`occupancy: 2`, exceeded 1)  
**G-10 RESULT:** inactive category PASS (`occupancy: 1`)  
**DATA CENSUS:** stagIn restaurants 5 (0 inactive), categories 5 (0 inactive), items 20 (0 unavailable); `pos_terminals` / `subscriptions` / bindings absent. Over-cap tenants not computable. No repair.  
**IMPLEMENTATION CHANGE:** `isNewCapacityDenial` in `commercialLimitOccupancy.ts` — occupancyDelta 0 + hard `limit_exceeded` is not a new-capacity denial. `checkLimit` formula unchanged.  
**MIGRATION:** NONE  
**DATABASE MUTATION:** synthetic G-11 owners on stagIn only  
**PRODUCTION MUTATION:** 0  
**TARGETED TESTS:** TiDB 15 + guards 5 + occupancy unit 8  
**REGRESSION TESTS:** G-07 P8, G-08 P12, TOCTOU category, G-09 mixed create, G-10 inactive category  
**BUILD:** PASS  
**CHECK:** 188  
**TS BASELINE:** 188 (unchanged)  
**COMMIT:** NONE  
**PUSH:** NONE  
**DEPLOY:** NONE  
**REMAINING RISKS:** Decide-time cap vs in-flight create (accepted). stagIn has no `pos_terminals` (POS proven on fixture). Occupancy app deploy (G-02) still open.  
**REQUIRED NOW:** Keep Policy B. Do not auto-cleanup on downgrade. Keep G-10 COUNT. Keep occupancyDelta 0 replace allowed at over-cap.  
**REQUIRED FOUNDATION FOR FUTURE:** Add-on conversion (Option F) only as a later Commercial billing program. Occupancy set must be declared before any new quantity key is enforced.  
**SAFE TO DEFER:** staff/branches/devices COUNT, POS hard delete, Production occupancy deploy, Final Occupancy Audit.  
**SHOULD NEVER BE INTRODUCED:** Downgrade debt tables, auto-delete/auto-deactivate on plan change, freeze-to-fit-cap, hide-inactive-to-free-slots, role-specific downgrade bypass, POS-specific Commercial limiter.  
**NEXT PROGRAM:** **STOP.** Do not start FINAL COMMERCIAL OCCUPANCY AUDIT, COMMERCIAL PRODUCTION CERTIFICATION, or POS-READ-APIS-IMPLEMENTATION-1 until G-11 is reviewed and certified.  
**FINAL:** G-11 — DOWNGRADE POLICY — **PASS**. Policy B confirmed. Existing resources remain. New capacity blocked. POS replace clarified. Production mutation 0. No git.
