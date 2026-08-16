# INVARIANTS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

| ID | Statement |
|----|-----------|
| I-G10-01 | Catalog/location occupancy = COUNT of persisted non-deleted rows (flags ignored) |
| I-G10-02 | POS occupancy = COUNT of provisioned lifecycles (registered + active) |
| I-G10-03 | `isActive`/`isAvailable` false does not release a slot |
| I-G10-04 | Catalog flag reactivation does not consume a slot |
| I-G10-05 | POS deactivated→active consumes via occupancy helper or fails at cap |
| I-G10-06 | POS replaced does not occupy; replace remains occupancyDelta 0 |
| I-G10-07 | Hard delete releases catalog/location slots |
| I-G10-08 | Inactive ≠ deleted |
| I-G10-09 | Owner and admin share this policy (G-09) |
| I-G10-10 | No shadow inactive counter |
