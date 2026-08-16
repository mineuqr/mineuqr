# INACTIVE POLICY INTERACTION

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

G-10 is preserved. G-11 does not redefine occupancy.

## Catalog / restaurants

Inactive still consumes capacity.

Example: cap 3, occupancy 5 after downgrade. Hiding two categories does **not** reduce occupancy to 3. Create remains denied.

TiDB: occupancy 2, `isActive = 0` on one category, create at cap 1 rejected, COUNT stayed 2.

## POS

Deactivated releases capacity.

Example: cap 3, provisioned 3, deactivate one → occupancy 2. That is G-10, not a downgrade cleanup.

## Do not

- Hide catalog rows to “fit” the new cap
- Count inactive catalog rows as free
- Count deactivated POS as still occupying
- Change `occupancyDelta = 0` replace
