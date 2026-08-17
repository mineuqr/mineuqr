# G-10 SMOKE

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Mode:** read-only data + deployed implementation. No resource state changes.

## Catalog

Deployed `countOccupancy` for restaurants / categories / items counts persisted non-deleted rows. `isActive = false` / `isAvailable = false` does **not** appear in those COUNT paths.

Production currently has 0 inactive restaurants, 0 inactive categories, 0 unavailable items. Existing rows therefore occupy. Compatible with G-10; no hide/unhide was performed to manufacture a flag.

## POS

Deployed POS occupancy counts `registered` + `active` only. `deactivated` releases. `replaced` does not occupy.

Production POS rows: **0** (provisioned / deactivated / replaced all 0). Compatible; no terminal was created or lifecycle-changed.

## Result

**G-10 PASS** — policy remains in the deployed artifact and Production census is compatible.
