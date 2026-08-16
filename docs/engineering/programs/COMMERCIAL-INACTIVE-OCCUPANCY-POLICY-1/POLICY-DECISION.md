# POLICY DECISION

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

## Decision

**OPTION E**, with catalog/location following **A** and POS following **provisioned COUNT**.

Commercial quantity is a **purchased allocation**. For menu and locations, a hidden row is still a reserved slot until **hard delete**. For POS, the purchased unit is a **provisioned terminal identity**, not a historical `replaced` row and not a `deactivated` (unprovisioned) terminal.

## Why this is not invented

- Live COUNT queries already implement it.
- POS-DOMAIN + replace hardening certified `isProvisionedLifecycle` and `occupancyDelta=0`.
- G-08 P4 proved deactivate vs provision keeps `occupancy <= cap` under that COUNT.
- CE / occupancy constitution: COUNT(*) of the **domain occupancy set**, not “rows that happen to be on the floor.”

## Owner / Admin / PLATFORM_OWNER

G-09: capacity is the tenant resource. Inactive policy is **not** role-specific. PLATFORM_OWNER unchanged (target tenant cap).

## Implementation

**NONE REQUIRED.** Changing COUNT to hide `isActive=false` would be Option B and is rejected. Changing POS to count `deactivated`/`replaced` would break certified replace and G-08 P4.
