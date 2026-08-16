# POS LIFECYCLE ANALYSIS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

| State | Operational POS access | Occupies `posTerminals` |
|-------|------------------------|-------------------------|
| registered | no (not cashier-ready) | **yes** (provisioned) |
| active | yes | **yes** |
| deactivated | no | **no** |
| replaced | no (terminal_replaced) | **no** |

Replace: old `replaced` + new `registered`, `occupancyDelta=0`. **Not altered.**

Deactivate does not use the occupancy helper; COUNT definition releases the slot. Reactivate from deactivated **does** use the helper — cannot bypass.

This is the shared Commercial rule applied to the POS occupancy set, not a POS-specific limiter.
