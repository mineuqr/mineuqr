# DATA CENSUS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  
**Scope:** read-only on mineuqr-stagIn via G07_DATABASE_URL  
**Mutation of historical rows:** none  

Captured at G-10 suite start (before synthetic G-10 owner writes).

| Metric | Value |
|--------|-------|
| restaurants total | 5 |
| restaurants `isActive=0` | 0 |
| categories total | 5 |
| categories `isActive=0` | 0 |
| menu_items total | 20 |
| menu_items `isAvailable=0` | 0 |
| `pos_terminals` table | **absent** on this branch |
| columns present | restaurants.isActive, categories.isActive, menu_items.isAvailable |

## Occupancy under each option (this snapshot)

All catalog rows are currently active/available, so A and B yield the **same** numbers (5 / 5 / 20). Option B would diverge only after flags flip — G-10 races proved COUNT does not drop on flip.

POS production table not on stagIn; policy proven via `occupancy_g07_terminals` (same provisioned COUNT as live `isProvisionedLifecycle`).

No data rewritten to fit policy.
