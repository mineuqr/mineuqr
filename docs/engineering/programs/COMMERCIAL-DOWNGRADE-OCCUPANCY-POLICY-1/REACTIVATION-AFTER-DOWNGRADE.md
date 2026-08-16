# REACTIVATION AFTER DOWNGRADE

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Catalog / restaurants

G-10: inactive/unavailable rows already occupy. Reactivation is a flag flip, not `occupancyDelta = 1`.

TiDB: occupancy 2, hide one category, show it again, create at cap 1 still rejected. Occupancy remained 2.

## POS

Deactivated releases occupancy. Reactivation (or equivalent provision) consumes a slot and **must** pass `withCommercialLimitOccupancy` with `occupancyDelta = 1`.

TiDB: provisioned 2, downgrade cap to 1, new provision rejected. Deactivate one → provisioned 1. Further provision at cap 1 rejected (`1 + 1 > 1`).

If occupancy ≥ new cap, POS reactivation fails closed. No role bypass.

## Do not confuse

| Action | Consumes after downgrade? |
|--------|---------------------------|
| Catalog `isActive` true | No |
| Restaurant `isActive` true | No |
| POS deactivated → provisioned | Yes |
| POS replace of a provisioned terminal | No (`occupancyDelta = 0`) |
