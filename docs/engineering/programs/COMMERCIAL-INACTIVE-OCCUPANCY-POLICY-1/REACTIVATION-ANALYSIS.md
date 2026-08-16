# REACTIVATION ANALYSIS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

| Resource | Reactivation | Slot? | At cap |
|----------|--------------|-------|--------|
| restaurant `isActive` false→true | flag update, no occupancy helper | **B — does not consume** (already in COUNT) | succeeds; extra create still denied |
| category `isActive` | same | **B** | same |
| item `isAvailable` | same | **B** | same |
| POS `deactivated`→`active` | `consumeProvisionedSlot` | **A — consumes** | **C — fails** FORBIDDEN if no slot |
| POS `registered`→`active` | lifecycle only | **B** (already provisioned) | n/a |
| POS `replaced` | cannot activate | n/a | domain error |

TiDB: inactive category reactivated, occupancy stayed 1, extra create rejected.

Cannot bypass: catalog reactivation never leaves COUNT; POS reactivation uses the certified primitive.
