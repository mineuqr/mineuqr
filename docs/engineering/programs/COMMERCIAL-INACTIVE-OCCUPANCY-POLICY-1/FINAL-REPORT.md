# FINAL REPORT

**PROGRAM:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1 (G-10)  
**STATUS:** PASS — POLICY CONFIRMED, NO IMPLEMENTATION REQUIRED  
**POLICY DECISION:** **E** — restaurants/categories/items: all persisted non-deleted rows occupy (operational flags do not release). POS: only `registered`+`active` occupy.  
**RESOURCE MATRIX:** See `RESOURCE-LIFECYCLE-MATRIX.md`. Staff/branches/devices are not live quantity occupancy.  
**ACTIVE SEMANTICS:** Catalog `isActive`/`isAvailable` true; POS registered/active provisioned.  
**INACTIVE SEMANTICS:** Catalog flags false **still occupy**. POS `deactivated` **does not occupy**.  
**DISABLED SEMANTICS:** No separate disabled enum; catalog uses the same booleans.  
**REPLACED SEMANTICS:** POS `replaced` does not occupy; `occupancyDelta=0` retained.  
**REACTIVATION SEMANTICS:** Catalog flag flip = B (no consume). POS deactivated→active = consume or fail at cap.  
**DEACTIVATION SEMANTICS:** Catalog does not release. POS deactivate releases provisioned slot.  
**POS RESULT:** Shared Commercial helper + provisioned COUNT. Replacement unchanged.  
**OWNER/ADMIN RESULT:** Same occupancy set (G-09). No role-specific inactive policy.  
**PLATFORM_OWNER RESULT:** Unchanged from G-09 (target tenant cap).  
**PLAN CHANGE INTERACTION:** Hidden catalog rows still count toward a future G-11 downgrade; POS deactivated do not. G-11 not implemented.  
**TIDB RESULT:** 9/9 PASS. create∥deactivate at cap: occupancy 1, create rejected. POS deactivate then provision: provisioned 1.  
**G-07 REGRESSION:** P8 PASS  
**G-08 REGRESSION:** P12 PASS  
**G-09 REGRESSION:** owner∥admin PASS (serial)  
**DATA CENSUS:** stagIn 5 restaurants (0 inactive), 5 categories (0 inactive), 20 items (0 unavailable); `pos_terminals` absent.  
**IMPLEMENTATION CHANGE:** **NONE REQUIRED**  
**MIGRATION:** NONE  
**DATABASE MUTATION:** synthetic G-10 owners on stagIn only  
**PRODUCTION MUTATION:** 0  
**TARGETED TESTS:** TiDB 9 + guards 3  
**REGRESSION TESTS:** G-07 P8, G-08 P12, TOCTOU category, G-09 mixed create  
**BUILD:** PASS  
**CHECK:** 188  
**TS BASELINE:** 188 (unchanged)  
**COMMIT:** NONE  
**PUSH:** NONE  
**DEPLOY:** NONE  
**REMAINING RISKS:** G-11 still open; Production occupancy deploy (G-02); stagIn has no `pos_terminals` (POS proven on fixture table).  
**REQUIRED NOW:** Keep catalog COUNT unfiltered; keep POS provisioned COUNT.  
**REQUIRED FOUNDATION FOR FUTURE:** Declare occupancy set per new quantity resource.  
**SAFE TO DEFER:** G-11, staff/branches COUNT paths, POS hard delete.  
**SHOULD NEVER BE INTRODUCED:** Inactive counters, grace Commercial, Option B catalog hide-to-free, counting `replaced` as a second terminal.  
**NEXT PROGRAM:** **STOP.** Do not start G-11 / Final Occupancy Audit / Commercial Production Certification / POS-READ-APIS until G-10 is reviewed.  
**FINAL:** G-10 — INACTIVE OCCUPANCY POLICY — **PASS**. Policy confirmed. No occupancy rewrite. Production mutation 0. No git.
